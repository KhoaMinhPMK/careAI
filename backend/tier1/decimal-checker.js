/**
 * Tier 1: Decimal Checker
 * R003: Misplaced decimal point (×10 or ÷10 error)
 */
const config = require('../config');

function checkDecimalError(observation, patient, history) {
  const alerts = [];

  if (observation.type !== 'weight' && observation.type !== 'height') return alerts;

  const value = observation.value;

  // Compare with recent history
  if (history && history.length > 0) {
    const recentValues = history
      .filter(h => h.type === observation.type)
      .sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date))
      .slice(0, 5);

    if (recentValues.length > 0) {
      const avgRecent = recentValues.reduce((s, v) => s + v.value, 0) / recentValues.length;

      // Check if value is ~10× the recent average (decimal shifted right)
      if (value > avgRecent * 8 && value < avgRecent * 12) {
        alerts.push({
          alert_type: 'R003_DECIMAL_SHIFT_RIGHT',
          severity: config.SEVERITY.CRITICAL,
          message: `${observation.type === 'weight' ? 'Weight' : 'Height'} ${value} ${observation.unit} is ~10× recent average (${avgRecent.toFixed(1)}). Possible decimal error?`,
          explanation: `The value ${value} appears to be approximately 10 times the recent average of ${avgRecent.toFixed(1)} ${observation.unit}. This strongly suggests a decimal point was misplaced (e.g., ${avgRecent.toFixed(1)} entered as ${(avgRecent * 10).toFixed(0)}).`,
          suggested_value: Math.round(value / 10 * 10) / 10
        });
      }

      // Check if value is ~1/10 the recent average (decimal shifted left)
      if (value < avgRecent / 8 && value > avgRecent / 12 && value > 0) {
        alerts.push({
          alert_type: 'R003_DECIMAL_SHIFT_LEFT',
          severity: config.SEVERITY.CRITICAL,
          message: `${observation.type === 'weight' ? 'Weight' : 'Height'} ${value} ${observation.unit} is ~1/10 recent average (${avgRecent.toFixed(1)}). Possible decimal error?`,
          explanation: `The value ${value} appears to be approximately 1/10 of the recent average of ${avgRecent.toFixed(1)} ${observation.unit}. This strongly suggests a decimal point was misplaced (e.g., ${avgRecent.toFixed(1)} entered as ${(avgRecent / 10).toFixed(1)}).`,
          suggested_value: Math.round(value * 10 * 10) / 10
        });
      }
    }
  }

  return alerts;
}

module.exports = { checkDecimalError };
