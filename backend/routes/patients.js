/**
 * Patients API Routes
 */
const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/patients — list all patients
router.get('/', (req, res) => {
  try {
    const { search, risk, ward, sort = 'name', order = 'asc' } = req.query;

    let query = `
      SELECT p.*,
        (SELECT COUNT(*) FROM alerts a WHERE a.patient_id = p.id AND a.resolved = 0) as active_alerts,
        (SELECT COUNT(*) FROM alerts a WHERE a.patient_id = p.id AND a.resolved = 0 AND a.severity = 'critical') as critical_alerts,
        (SELECT AVG(o.data_quality_score) FROM observations o WHERE o.patient_id = p.id) as avg_dq_score,
        (SELECT COUNT(*) FROM observations o WHERE o.patient_id = p.id) as observation_count
      FROM patients p WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (p.name LIKE ? OR p.medical_record_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (risk) {
      query += ` AND p.risk_level = ?`;
      params.push(risk);
    }
    if (ward) {
      query += ` AND p.ward = ?`;
      params.push(ward);
    }

    const validSorts = { name: 'p.name', risk: 'p.risk_level', alerts: 'active_alerts', dq: 'avg_dq_score', admission: 'p.admission_date' };
    const sortCol = validSorts[sort] || 'p.name';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortCol} ${sortOrder}`;

    const patients = db.prepare(query).all(...params);

    res.json({
      patients: patients.map(p => ({
        ...p,
        avg_dq_score: p.avg_dq_score ? Math.round(p.avg_dq_score * 100) / 100 : null
      })),
      total: patients.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/patients/:id — single patient with full data
router.get('/:id', (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const observations = db.prepare('SELECT * FROM observations WHERE patient_id = ? ORDER BY effective_date').all(patient.id);
    const alerts = db.prepare(`
      SELECT * FROM alerts WHERE patient_id = ? ORDER BY
        CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'warning' THEN 3 WHEN 'info' THEN 4 END,
        created_at DESC
    `).all(patient.id);
    const notes = db.prepare('SELECT * FROM clinical_notes WHERE patient_id = ? ORDER BY effective_date DESC').all(patient.id);

    res.json({
      patient,
      observations,
      alerts,
      notes,
      summary: {
        total_observations: observations.length,
        active_alerts: alerts.filter(a => !a.resolved).length,
        critical_alerts: alerts.filter(a => a.severity === 'critical' && !a.resolved).length,
        total_notes: notes.length,
        avg_dq_score: observations.length > 0
          ? Math.round(observations.reduce((s, o) => s + (o.data_quality_score || 1), 0) / observations.length * 100) / 100
          : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/patients/:id/growth — growth chart data
router.get('/:id/growth', (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const weights = db.prepare('SELECT * FROM observations WHERE patient_id = ? AND type = ? ORDER BY effective_date').all(patient.id, 'weight');
    const heights = db.prepare('SELECT * FROM observations WHERE patient_id = ? AND type = ? ORDER BY effective_date').all(patient.id, 'height');

    res.json({
      patient: { id: patient.id, name: patient.name, date_of_birth: patient.date_of_birth, gender: patient.gender },
      weights,
      heights
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
