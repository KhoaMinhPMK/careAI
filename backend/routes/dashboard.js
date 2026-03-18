/**
 * Dashboard API Routes
 */
const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
  try {
    const totalPatients = db.prepare('SELECT COUNT(*) as count FROM patients').get().count;
    const totalObservations = db.prepare('SELECT COUNT(*) as count FROM observations').get().count;
    const totalAlerts = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE resolved = 0').get().count;
    const totalNotes = db.prepare('SELECT COUNT(*) as count FROM clinical_notes').get().count;

    const severityCounts = db.prepare(`
      SELECT severity, COUNT(*) as count FROM alerts WHERE resolved = 0 GROUP BY severity
    `).all();

    const riskCounts = db.prepare(`
      SELECT risk_level, COUNT(*) as count FROM patients GROUP BY risk_level
    `).all();

    const wardCounts = db.prepare(`
      SELECT ward, COUNT(*) as count FROM patients GROUP BY ward
    `).all();

    const avgDQ = db.prepare('SELECT AVG(data_quality_score) as avg FROM observations').get().avg;

    // Alert trend (alerts per day, last 14 days)
    const alertTrend = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM alerts
      WHERE created_at >= datetime('now', '-14 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all();

    // Alert type distribution
    const alertTypes = db.prepare(`
      SELECT alert_type, COUNT(*) as count FROM alerts WHERE resolved = 0 GROUP BY alert_type ORDER BY count DESC LIMIT 10
    `).all();

    res.json({
      summary: {
        total_patients: totalPatients,
        total_observations: totalObservations,
        active_alerts: totalAlerts,
        total_notes: totalNotes,
        avg_data_quality: Math.round((avgDQ || 0) * 100) / 100
      },
      severity_distribution: severityCounts.reduce((acc, r) => { acc[r.severity] = r.count; return acc; }, {}),
      risk_distribution: riskCounts.reduce((acc, r) => { acc[r.risk_level] = r.count; return acc; }, {}),
      ward_distribution: wardCounts,
      alert_trend: alertTrend,
      alert_types: alertTypes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/recent-alerts
router.get('/recent-alerts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const alerts = db.prepare(`
      SELECT a.*, p.name as patient_name, p.medical_record_number
      FROM alerts a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.resolved = 0
      ORDER BY
        CASE a.severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'warning' THEN 3
          WHEN 'info' THEN 4
        END,
        a.created_at DESC
      LIMIT ?
    `).all(limit);

    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
