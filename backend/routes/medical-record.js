/**
 * CareAI — Medical Record Input API
 * POST /api/medical-record         — Save complete record
 * POST /api/medical-record/validate — Validate before save
 * GET  /api/lab-results/:id        — Get lab results for patient
 * GET  /api/medical-orders/:id     — Get orders for patient
 * GET  /api/vitals/:id             — Get vitals for patient
 */
const express = require('express');
const router = express.Router();
const db = require('../database');
const { validateObservation, validatePatient } = require('../tier1/validator');
const { detectContradictions } = require('../tier2/contradiction');
const { extractSignals } = require('../tier2/nlp-engine');
const { validateLabResult, crossValidateLabs, detectLabDecimalError } = require('../tier1/lab-validator');

// ─── POST /api/medical-record ─────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { patient, vitals, labs, notes, orders } = req.body;
    if (!patient || !patient.name || !patient.medical_record_number) {
      return res.status(400).json({ error: 'Thiếu thông tin bệnh nhân (tên, mã y tế)' });
    }

    const allAlerts = [];

    // 1. Insert or update patient
    let patientId;
    const existing = db.prepare('SELECT id FROM patients WHERE medical_record_number = ?').get(patient.medical_record_number);

    if (existing) {
      patientId = existing.id;
      db.prepare(`UPDATE patients SET name=?, date_of_birth=?, gender=?, ward=?, diagnosis=?, admission_date=? WHERE id=?`)
        .run(patient.name, patient.date_of_birth, patient.gender, patient.ward, patient.diagnosis || null, patient.admission_date, patientId);
    } else {
      const info = db.prepare(`INSERT INTO patients (medical_record_number, name, date_of_birth, gender, admission_date, ward, diagnosis, admission_weight_kg, admission_height_cm)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(patient.medical_record_number, patient.name, patient.date_of_birth, patient.gender,
             patient.admission_date, patient.ward, patient.diagnosis || null,
             patient.weight || null, patient.height || null);
      patientId = info.lastInsertRowid;
    }

    const patientRow = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);

    // 2. Insert vitals
    if (vitals && (vitals.heart_rate || vitals.respiratory_rate || vitals.temperature)) {
      db.prepare(`INSERT INTO vitals (patient_id, heart_rate, respiratory_rate, temperature, blood_pressure, spo2, crt, effective_date, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(patientId, vitals.heart_rate || null, vitals.respiratory_rate || null,
             vitals.temperature || null, vitals.blood_pressure || null,
             vitals.spo2 || null, vitals.crt || null,
             vitals.effective_date || new Date().toISOString().split('T')[0],
             vitals.recorded_by || null);
    }

    // 3. Insert observations (weight, height)
    const insertedObs = [];
    if (patient.weight) {
      const info = db.prepare(`INSERT INTO observations (patient_id, type, value, unit, effective_date, source)
        VALUES (?, 'weight', ?, 'kg', ?, 'manual')`)
        .run(patientId, patient.weight, patient.admission_date || new Date().toISOString().split('T')[0]);
      insertedObs.push({ id: info.lastInsertRowid, type: 'weight', value: patient.weight, unit: 'kg', effective_date: patient.admission_date });
    }
    if (patient.height) {
      const info = db.prepare(`INSERT INTO observations (patient_id, type, value, unit, effective_date, source)
        VALUES (?, 'height', ?, 'cm', ?, 'manual')`)
        .run(patientId, patient.height, patient.admission_date || new Date().toISOString().split('T')[0]);
      insertedObs.push({ id: info.lastInsertRowid, type: 'height', value: patient.height, unit: 'cm', effective_date: patient.admission_date });
    }

    // 4. Run Tier 1 validation on observations
    const existingObs = db.prepare('SELECT * FROM observations WHERE patient_id = ? ORDER BY effective_date').all(patientId);
    for (const obs of insertedObs) {
      const history = existingObs.filter(o => o.id !== obs.id);
      const result = validateObservation(obs, patientRow, history);
      // Update z-score
      if (result.zscore) {
        db.prepare('UPDATE observations SET zscore = ?, zscore_interpretation = ?, data_quality_score = ? WHERE id = ?')
          .run(result.zscore.zscore, result.zscore.interpretation, result.data_quality_score, obs.id);
      }
      allAlerts.push(...result.alerts);
    }

    // 5. Insert lab results
    const labAlerts = [];
    if (labs && Array.isArray(labs) && labs.length > 0) {
      const insertLab = db.prepare(`INSERT INTO lab_results (patient_id, test_category, test_name, result_value, result_text, unit, reference_min, reference_max, is_abnormal, effective_date, ordering_doctor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      for (const lab of labs) {
        // Validate against reference range
        const validation = validateLabResult(lab.test_key, lab.result_value, lab.test_category);
        const decimalCheck = detectLabDecimalError(lab.test_key, lab.result_value, lab.test_category);

        insertLab.run(patientId, lab.test_category, lab.test_name || validation.ref?.name || lab.test_key,
          lab.result_value, lab.result_text || null, lab.unit || validation.ref?.unit || '',
          validation.ref?.min ?? null, validation.ref?.max ?? null,
          validation.is_abnormal ? 1 : 0,
          lab.effective_date || new Date().toISOString().split('T')[0],
          lab.ordering_doctor || null);

        if (validation.is_abnormal) {
          labAlerts.push({
            alert_type: `LAB_ABNORMAL_${lab.test_key.toUpperCase()}`,
            severity: validation.level === 'critical' ? 'critical' : validation.level === 'high' ? 'high' : 'warning',
            tier: 'tier1',
            message: validation.message,
            explanation: `Giá trị ngoài ngưỡng tham chiếu. CSBT: ${validation.ref?.min ?? '—'}–${validation.ref?.max ?? '—'} ${validation.ref?.unit || ''}`,
            patient_id: patientId
          });
        }

        if (decimalCheck) {
          labAlerts.push({ ...decimalCheck, tier: 'tier1', patient_id: patientId });
        }
      }

      // Cross-validation
      const crossAlerts = crossValidateLabs(labs);
      labAlerts.push(...crossAlerts.map(a => ({ ...a, patient_id: patientId })));
    }
    allAlerts.push(...labAlerts);

    // 6. Insert clinical notes
    if (notes && notes.content) {
      const signals = extractSignals(notes.content);
      db.prepare(`INSERT INTO clinical_notes (patient_id, content, author, note_type, effective_date, extracted_signals)
        VALUES (?, ?, ?, ?, ?, ?)`)
        .run(patientId, notes.content, notes.author || null, notes.note_type || 'progress',
             notes.effective_date || new Date().toISOString().split('T')[0],
             JSON.stringify(signals));

      // Tier 2 contradiction check
      const allNotes = db.prepare('SELECT * FROM clinical_notes WHERE patient_id = ?').all(patientId);
      for (const obs of insertedObs) {
        if (obs.type === 'weight') {
          const prevObs = existingObs.filter(o => o.type === 'weight').sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
          obs._prev_value = prevObs.length > 0 ? prevObs[0].value : undefined;
          const contradictions = detectContradictions(obs, patientRow, allNotes);
          allAlerts.push(...contradictions);
        }
      }
    }

    // 7. Insert medical orders
    if (orders && Array.isArray(orders)) {
      const insertOrder = db.prepare(`INSERT INTO medical_orders (patient_id, order_type, content, dosage, frequency, route, effective_date, ordering_doctor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const order of orders) {
        insertOrder.run(patientId, order.order_type, order.content,
          order.dosage || null, order.frequency || null, order.route || null,
          order.effective_date || new Date().toISOString().split('T')[0],
          order.ordering_doctor || null);
      }
    }

    // 8. Save alerts to DB
    const insertAlert = db.prepare(`INSERT INTO alerts (patient_id, observation_id, tier, severity, alert_type, message, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const alert of allAlerts) {
      insertAlert.run(alert.patient_id || patientId, alert.observation_id || null,
        alert.tier || 'tier1', alert.severity, alert.alert_type, alert.message, alert.explanation || null);
    }

    // 9. Update risk level
    const critCount = allAlerts.filter(a => a.severity === 'critical').length;
    const highCount = allAlerts.filter(a => a.severity === 'high').length;
    let riskLevel = 'low';
    if (critCount > 0) riskLevel = 'critical';
    else if (highCount > 2) riskLevel = 'critical';
    else if (highCount > 0) riskLevel = 'high';
    else if (allAlerts.filter(a => a.severity === 'warning').length > 0) riskLevel = 'moderate';

    db.prepare('UPDATE patients SET risk_level = ? WHERE id = ?').run(riskLevel, patientId);

    res.json({
      success: true,
      patient_id: patientId,
      is_new: !existing,
      risk_level: riskLevel,
      alerts: allAlerts,
      summary: {
        total_alerts: allAlerts.length,
        critical: critCount,
        high: highCount,
        warning: allAlerts.filter(a => a.severity === 'warning').length,
        info: allAlerts.filter(a => a.severity === 'info').length
      }
    });

  } catch (err) {
    console.error('Medical record save error:', err);
    res.status(500).json({ error: 'Lỗi lưu hồ sơ: ' + err.message });
  }
});

// ─── POST /api/medical-record/validate ────────────────────────
router.post('/validate', (req, res) => {
  try {
    const { field, value, patient, category, test_key } = req.body;
    const result = {};

    if (field === 'lab' && test_key && category) {
      result.validation = validateLabResult(test_key, parseFloat(value), category);
      result.decimal_check = detectLabDecimalError(test_key, parseFloat(value), category);
    }

    if (field === 'weight' && value && patient) {
      const { weightForAgeZScore } = require('../tier1/zscore');
      const zResult = weightForAgeZScore(parseFloat(value), patient.date_of_birth, patient.gender);
      result.zscore = zResult;
      result.range = require('../tier1/unit-checker');
    }

    if (field === 'height' && value && patient) {
      const { heightForAgeZScore } = require('../tier1/zscore');
      const zResult = heightForAgeZScore(parseFloat(value), patient.date_of_birth, patient.gender);
      result.zscore = zResult;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/lab-results/:id ─────────────────────────────────
router.get('/lab-results/:id', (req, res) => {
  try {
    const results = db.prepare('SELECT * FROM lab_results WHERE patient_id = ? ORDER BY effective_date DESC, test_category, test_name')
      .all(req.params.id);
    res.json({ lab_results: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/medical-orders/:id ──────────────────────────────
router.get('/medical-orders/:id', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM medical_orders WHERE patient_id = ? ORDER BY effective_date DESC')
      .all(req.params.id);
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/vitals/:id ──────────────────────────────────────
router.get('/vitals/:id', (req, res) => {
  try {
    const vitals = db.prepare('SELECT * FROM vitals WHERE patient_id = ? ORDER BY effective_date DESC')
      .all(req.params.id);
    res.json({ vitals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
