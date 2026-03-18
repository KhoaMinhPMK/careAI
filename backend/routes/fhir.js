/**
 * FHIR Export API Routes
 */
const express = require('express');
const router = express.Router();
const db = require('../database');
const { assembleFHIRBundle, generatePatientResource, generateObservationResource } = require('../tier3/fhir-bundle');

// GET /api/fhir/:patientId — generate FHIR bundle for a patient
router.get('/:patientId', (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const observations = db.prepare('SELECT * FROM observations WHERE patient_id = ? ORDER BY effective_date').all(patient.id);
    const minDQ = parseFloat(req.query.min_dq) || 0.5;

    const bundle = assembleFHIRBundle(patient, observations, { minDataQuality: minDQ });

    // Save to database
    const existing = db.prepare('SELECT id FROM fhir_exports WHERE patient_id = ? AND resource_type = ?').get(patient.id, 'Bundle');
    if (existing) {
      db.prepare('UPDATE fhir_exports SET fhir_json = ?, created_at = datetime("now") WHERE id = ?').run(JSON.stringify(bundle), existing.id);
    } else {
      db.prepare('INSERT INTO fhir_exports (patient_id, resource_type, fhir_json) VALUES (?, ?, ?)').run(patient.id, 'Bundle', JSON.stringify(bundle));
    }

    res.json(bundle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fhir/:patientId/download — download FHIR bundle as file
router.get('/:patientId/download', (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const observations = db.prepare('SELECT * FROM observations WHERE patient_id = ? ORDER BY effective_date').all(patient.id);
    const bundle = assembleFHIRBundle(patient, observations);

    res.setHeader('Content-Disposition', `attachment; filename="fhir-bundle-${patient.medical_record_number}.json"`);
    res.setHeader('Content-Type', 'application/fhir+json');
    res.json(bundle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
