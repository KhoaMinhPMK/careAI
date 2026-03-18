/**
 * Tier 1: Duplicate / Carried-Forward Checker
 * R004: Identical consecutive values (possible copy error)
 * R005: Value unchanged for too many consecutive days
 */
const config = require('../config');

function checkDuplicates(observation, history) {
  const alerts = [];

  if (!history || history.length === 0) return alerts;

  const sameType = history
    .filter(h => h.type === observation.type)
    .sort((a, b) => new Date(a.effective_date) - new Date(b.effective_date));

  if (sameType.length === 0) return alerts;

  // R004: Check for exact duplicate on same day
  const sameDayDups = sameType.filter(h =>
    h.effective_date === observation.effective_date && h.value === observation.value && h.id !== observation.id
  );

  if (sameDayDups.length > 0) {
    alerts.push({
      alert_type: 'R004_DUPLICATE',
      severity: config.SEVERITY.WARNING,
      message: `Duplicate ${observation.type} entry: ${observation.value} ${observation.unit} recorded multiple times on ${observation.effective_date}`,
      explanation: `An identical ${observation.type} measurement of ${observation.value} ${observation.unit} was already recorded on this date. This may indicate a data entry duplication.`
    });
  }

  // R005: Check for carried-forward values
  const allValues = [...sameType, observation].sort((a, b) => new Date(a.effective_date) - new Date(b.effective_date));
  let consecutiveCount = 0;
  const currentValue = observation.value;

  for (let i = allValues.length - 1; i >= 0; i--) {
    if (allValues[i].value === currentValue) {
      consecutiveCount++;
    } else {
      break;
    }
  }

  if (consecutiveCount >= config.CARRIED_FORWARD_THRESHOLD) {
    const daySpan = Math.abs(
      (new Date(allValues[allValues.length - 1].effective_date) - new Date(allValues[allValues.length - consecutiveCount].effective_date)) / (1000 * 60 * 60 * 24)
    );

    if (daySpan >= config.DUPLICATE_CONSECUTIVE_DAYS_THRESHOLD) {
      alerts.push({
        alert_type: 'R005_CARRIED_FORWARD',
        severity: config.SEVERITY.HIGH,
        message: `${observation.type === 'weight' ? 'Weight' : 'Height'} ${observation.value} ${observation.unit} unchanged for ${consecutiveCount} consecutive entries over ${Math.round(daySpan)} days`,
        explanation: `The value ${observation.value} ${observation.unit} has remained exactly the same across ${consecutiveCount} entries spanning ${Math.round(daySpan)} days. For a pediatric patient, this is unusual and may indicate the value is being carried forward rather than actually measured.`
      });
    }
  }

  return alerts;
}

module.exports = { checkDuplicates };
