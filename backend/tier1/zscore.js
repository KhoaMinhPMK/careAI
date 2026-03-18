/**
 * WHO Growth Standards z-score Calculator (Simplified)
 * Uses LMS (Lambda-Mu-Sigma) method approximation
 * Reference: WHO Child Growth Standards (2006, 2007)
 */

// Simplified WHO reference data (weight-for-age, 0-18 years)
// Format: { ageMonths: { male: { L, M, S }, female: { L, M, S } } }
const WEIGHT_FOR_AGE = {
  0: { male: { L: 0.3487, M: 3.3464, S: 0.14602 }, female: { L: 0.3809, M: 3.2322, S: 0.14171 } },
  1: { male: { L: 0.2297, M: 4.4709, S: 0.13395 }, female: { L: 0.1714, M: 4.1873, S: 0.13724 } },
  3: { male: { L: 0.0665, M: 6.3762, S: 0.12685 }, female: { L: -0.0631, M: 5.8458, S: 0.12926 } },
  6: { male: { L: -0.0250, M: 7.9340, S: 0.12405 }, female: { L: -0.2180, M: 7.2970, S: 0.12760 } },
  12: { male: { L: -0.1570, M: 9.6500, S: 0.11810 }, female: { L: -0.5350, M: 8.9500, S: 0.12740 } },
  18: { male: { L: -0.3520, M: 10.9000, S: 0.11650 }, female: { L: -0.8410, M: 10.2000, S: 0.13000 } },
  24: { male: { L: -0.5080, M: 12.1500, S: 0.11640 }, female: { L: -1.1100, M: 11.5000, S: 0.13300 } },
  36: { male: { L: -0.6760, M: 14.3400, S: 0.11900 }, female: { L: -1.3600, M: 13.8700, S: 0.13580 } },
  48: { male: { L: -0.8020, M: 16.3300, S: 0.12260 }, female: { L: -1.5800, M: 16.0500, S: 0.13800 } },
  60: { male: { L: -1.0100, M: 18.3400, S: 0.12700 }, female: { L: -1.8500, M: 18.2100, S: 0.14160 } },
  72: { male: { L: -1.1900, M: 20.5000, S: 0.13200 }, female: { L: -2.0200, M: 20.4100, S: 0.14600 } },
  96: { male: { L: -1.4200, M: 25.3000, S: 0.14200 }, female: { L: -2.3500, M: 25.1000, S: 0.15500 } },
  120: { male: { L: -1.6100, M: 31.0000, S: 0.15700 }, female: { L: -2.2100, M: 31.5000, S: 0.16100 } },
  144: { male: { L: -1.5700, M: 38.6000, S: 0.16200 }, female: { L: -1.6200, M: 40.5000, S: 0.16000 } },
  168: { male: { L: -1.2000, M: 49.0000, S: 0.15500 }, female: { L: -0.9500, M: 49.5000, S: 0.14800 } },
  192: { male: { L: -0.7700, M: 58.5000, S: 0.14200 }, female: { L: -0.5000, M: 54.5000, S: 0.13500 } },
  216: { male: { L: -0.4800, M: 65.0000, S: 0.13000 }, female: { L: -0.2500, M: 57.0000, S: 0.12800 } }
};

// Height-for-age (simplified)
const HEIGHT_FOR_AGE = {
  0: { male: { L: 1, M: 49.88, S: 0.03795 }, female: { L: 1, M: 49.15, S: 0.03790 } },
  1: { male: { L: 1, M: 54.72, S: 0.03557 }, female: { L: 1, M: 53.69, S: 0.03614 } },
  3: { male: { L: 1, M: 61.43, S: 0.03328 }, female: { L: 1, M: 59.80, S: 0.03467 } },
  6: { male: { L: 1, M: 67.62, S: 0.03099 }, female: { L: 1, M: 65.73, S: 0.03350 } },
  12: { male: { L: 1, M: 75.75, S: 0.02997 }, female: { L: 1, M: 73.98, S: 0.03224 } },
  18: { male: { L: 1, M: 82.21, S: 0.02896 }, female: { L: 1, M: 80.50, S: 0.03116 } },
  24: { male: { L: 1, M: 87.11, S: 0.02850 }, female: { L: 1, M: 85.70, S: 0.03100 } },
  36: { male: { L: 1, M: 95.10, S: 0.02800 }, female: { L: 1, M: 94.00, S: 0.03000 } },
  48: { male: { L: 1, M: 102.50, S: 0.02750 }, female: { L: 1, M: 101.50, S: 0.02950 } },
  60: { male: { L: 1, M: 109.50, S: 0.02700 }, female: { L: 1, M: 108.50, S: 0.02900 } },
  72: { male: { L: 1, M: 115.50, S: 0.02680 }, female: { L: 1, M: 115.00, S: 0.02850 } },
  96: { male: { L: 1, M: 127.00, S: 0.02650 }, female: { L: 1, M: 127.00, S: 0.02800 } },
  120: { male: { L: 1, M: 137.50, S: 0.02600 }, female: { L: 1, M: 138.50, S: 0.02750 } },
  144: { male: { L: 1, M: 149.50, S: 0.02550 }, female: { L: 1, M: 151.50, S: 0.02600 } },
  168: { male: { L: 1, M: 163.00, S: 0.02500 }, female: { L: 1, M: 159.00, S: 0.02450 } },
  192: { male: { L: 1, M: 172.00, S: 0.02400 }, female: { L: 1, M: 162.50, S: 0.02350 } },
  216: { male: { L: 1, M: 176.00, S: 0.02350 }, female: { L: 1, M: 163.50, S: 0.02300 } }
};

/**
 * Calculate age in months from date of birth
 */
function ageInMonths(dob, refDate = new Date()) {
  const birth = new Date(dob);
  const months = (refDate.getFullYear() - birth.getFullYear()) * 12 + (refDate.getMonth() - birth.getMonth());
  if (refDate.getDate() < birth.getDate()) return months - 1;
  return Math.max(0, months);
}

/**
 * Interpolate LMS values for a given age
 */
function interpolateLMS(table, ageMonths, gender) {
  const ages = Object.keys(table).map(Number).sort((a, b) => a - b);

  // Clamp to bounds
  if (ageMonths <= ages[0]) return table[ages[0]][gender];
  if (ageMonths >= ages[ages.length - 1]) return table[ages[ages.length - 1]][gender];

  // Find bracket
  let lower = ages[0], upper = ages[ages.length - 1];
  for (let i = 0; i < ages.length - 1; i++) {
    if (ageMonths >= ages[i] && ageMonths <= ages[i + 1]) {
      lower = ages[i];
      upper = ages[i + 1];
      break;
    }
  }

  const fraction = (ageMonths - lower) / (upper - lower);
  const lowerLMS = table[lower][gender];
  const upperLMS = table[upper][gender];

  return {
    L: lowerLMS.L + fraction * (upperLMS.L - lowerLMS.L),
    M: lowerLMS.M + fraction * (upperLMS.M - lowerLMS.M),
    S: lowerLMS.S + fraction * (upperLMS.S - lowerLMS.S)
  };
}

/**
 * Calculate z-score using LMS method
 */
function calculateZScore(value, L, M, S) {
  if (L === 0) {
    return Math.log(value / M) / S;
  }
  return (Math.pow(value / M, L) - 1) / (L * S);
}

/**
 * Get z-score interpretation
 */
function interpretZScore(z) {
  if (z < -3) return 'severely underweight/stunted';
  if (z < -2) return 'underweight/stunted';
  if (z < -1) return 'below average';
  if (z <= 1) return 'normal';
  if (z <= 2) return 'above average';
  if (z <= 3) return 'overweight/tall';
  return 'obese/very tall';
}

/**
 * Calculate weight-for-age z-score
 */
function weightForAgeZScore(weightKg, dob, gender, refDate) {
  const months = ageInMonths(dob, refDate);
  const lms = interpolateLMS(WEIGHT_FOR_AGE, months, gender);
  const z = calculateZScore(weightKg, lms.L, lms.M, lms.S);
  return {
    zscore: Math.round(z * 100) / 100,
    interpretation: interpretZScore(z),
    percentile: Math.round(normalCDF(z) * 10000) / 100,
    ageMonths: months,
    median: lms.M
  };
}

/**
 * Calculate height-for-age z-score
 */
function heightForAgeZScore(heightCm, dob, gender, refDate) {
  const months = ageInMonths(dob, refDate);
  const lms = interpolateLMS(HEIGHT_FOR_AGE, months, gender);
  const z = calculateZScore(heightCm, lms.L, lms.M, lms.S);
  return {
    zscore: Math.round(z * 100) / 100,
    interpretation: interpretZScore(z),
    percentile: Math.round(normalCDF(z) * 10000) / 100,
    ageMonths: months,
    median: lms.M
  };
}

/**
 * Calculate BMI z-score (simplified: use weight-for-age as proxy)
 */
function bmiZScore(weightKg, heightCm, dob, gender, refDate) {
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const months = ageInMonths(dob, refDate);
  // For children, use WHO BMI-for-age charts (approximated)
  const lms = interpolateLMS(WEIGHT_FOR_AGE, months, gender);
  // Approximate BMI z-score
  const expectedBMI = lms.M / Math.pow(interpolateLMS(HEIGHT_FOR_AGE, months, gender).M / 100, 2);
  const z = (bmi - expectedBMI) / (expectedBMI * 0.15); // rough approximation
  return {
    bmi: Math.round(bmi * 10) / 10,
    zscore: Math.round(z * 100) / 100,
    interpretation: interpretZScore(z),
    percentile: Math.round(normalCDF(z) * 10000) / 100,
    ageMonths: months
  };
}

/**
 * Normal CDF approximation
 */
function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

module.exports = {
  ageInMonths,
  weightForAgeZScore,
  heightForAgeZScore,
  bmiZScore,
  interpretZScore,
  calculateZScore
};
