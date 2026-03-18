/**
 * Validation API Routes
 */
const express = require('express');
const router = express.Router();
const db = require('../database');
const { validatePatient } = require('../tier1/validator');
const { detectContradictions } = require('../tier2/contradiction');
const { extractSignals } = require('../tier2/nlp-engine');

// GET /api/validation/:patientId — run validation for a patient
router.get('/:patientId', (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const observations = db.prepare('SELECT * FROM observations WHERE patient_id = ? ORDER BY effective_date').all(patient.id);
    const notes = db.prepare('SELECT * FROM clinical_notes WHERE patient_id = ?').all(patient.id);

    // Tier 1 validation
    const tier1Result = validatePatient(patient, observations);

    // Tier 2 contradiction detection
    const tier2Alerts = [];
    const sortedObs = observations.sort((a, b) => new Date(a.effective_date) - new Date(b.effective_date));
    for (let i = 1; i < sortedObs.length; i++) {
      const obs = { ...sortedObs[i], _prev_value: sortedObs[i - 1].type === sortedObs[i].type ? sortedObs[i - 1].value : undefined };
      const contradictions = detectContradictions(obs, patient, notes);
      tier2Alerts.push(...contradictions);
    }

    // NLP extraction from notes
    const noteAnalysis = notes.map(n => ({
      note_id: n.id,
      effective_date: n.effective_date,
      note_type: n.note_type,
      signals: n.extracted_signals ? JSON.parse(n.extracted_signals) : extractSignals(n.content)
    }));

    res.json({
      patient_id: patient.id,
      patient_name: patient.name,
      tier1: tier1Result,
      tier2: {
        alerts: tier2Alerts,
        total: tier2Alerts.length
      },
      note_analysis: noteAnalysis,
      combined_summary: {
        total_alerts: tier1Result.summary.total_alerts + tier2Alerts.length,
        tier1_alerts: tier1Result.summary.total_alerts,
        tier2_alerts: tier2Alerts.length,
        average_data_quality: tier1Result.summary.average_data_quality,
        severity_counts: {
          critical: tier1Result.summary.severity_counts.critical + tier2Alerts.filter(a => a.severity === 'critical').length,
          high: tier1Result.summary.severity_counts.high + tier2Alerts.filter(a => a.severity === 'high').length,
          warning: tier1Result.summary.severity_counts.warning + tier2Alerts.filter(a => a.severity === 'warning').length,
          info: tier1Result.summary.severity_counts.info + tier2Alerts.filter(a => a.severity === 'info').length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
