/**
 * Tier 1 Validation Orchestrator
 * Runs all Tier 1 checks and returns structured alerts
 */
const { checkUnitConfusion } = require('./unit-checker');
const { checkDecimalError } = require('./decimal-checker');
const { checkDuplicates } = require('./duplicate-checker');
const { checkTrajectory } = require('./trajectory-checker');
const { weightForAgeZScore, heightForAgeZScore } = require('./zscore');

/**
 * Validate a single observation against all Tier 1 rules
 */
function validateObservation(observation, patient, history) {
  const allAlerts = [];

  // Run all checkers
  const unitAlerts = checkUnitConfusion(observation, patient);
  const decimalAlerts = checkDecimalError(observation, patient, history);
  const duplicateAlerts = checkDuplicates(observation, history);
  const trajectoryAlerts = checkTrajectory(observation, patient, history);

  allAlerts.push(...unitAlerts, ...decimalAlerts, ...duplicateAlerts, ...trajectoryAlerts);

  // Calculate data quality score (1.0 = perfect, 0.0 = unreliable)
  let dqScore = 1.0;
  for (const alert of allAlerts) {
    switch (alert.severity) {
      case 'critical': dqScore -= 0.4; break;
      case 'high': dqScore -= 0.25; break;
      case 'warning': dqScore -= 0.1; break;
      case 'info': dqScore -= 0.05; break;
    }
  }
  dqScore = Math.max(0, Math.round(dqScore * 100) / 100);

  // Calculate z-score for the observation
  let zscoreResult = null;
  if (patient) {
    if (observation.type === 'weight') {
      zscoreResult = weightForAgeZScore(observation.value, patient.date_of_birth, patient.gender, new Date(observation.effective_date));
    } else if (observation.type === 'height') {
      zscoreResult = heightForAgeZScore(observation.value, patient.date_of_birth, patient.gender, new Date(observation.effective_date));
    }
  }

  return {
    observation_id: observation.id,
    alerts: allAlerts.map(a => ({ ...a, tier: 'tier1', observation_id: observation.id, patient_id: patient?.id })),
    data_quality_score: dqScore,
    zscore: zscoreResult,
    total_alerts: allAlerts.length,
    severity_counts: {
      critical: allAlerts.filter(a => a.severity === 'critical').length,
      high: allAlerts.filter(a => a.severity === 'high').length,
      warning: allAlerts.filter(a => a.severity === 'warning').length,
      info: allAlerts.filter(a => a.severity === 'info').length
    }
  };
}

/**
 * Validate all observations for a patient
 */
function validatePatient(patient, observations) {
  const results = [];
  const sorted = [...observations].sort((a, b) => new Date(a.effective_date) - new Date(b.effective_date));

  for (let i = 0; i < sorted.length; i++) {
    const obs = sorted[i];
    const history = sorted.slice(0, i); // all observations before this one
    const result = validateObservation(obs, patient, history);
    results.push(result);
  }

  // Summary
  const allAlerts = results.flatMap(r => r.alerts);
  const avgDQ = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.data_quality_score, 0) / results.length * 100) / 100
    : 1.0;

  return {
    patient_id: patient.id,
    observations: results,
    summary: {
      total_observations: results.length,
      total_alerts: allAlerts.length,
      average_data_quality: avgDQ,
      severity_counts: {
        critical: allAlerts.filter(a => a.severity === 'critical').length,
        high: allAlerts.filter(a => a.severity === 'high').length,
        warning: allAlerts.filter(a => a.severity === 'warning').length,
        info: allAlerts.filter(a => a.severity === 'info').length
      }
    }
  };
}

module.exports = { validateObservation, validatePatient };
