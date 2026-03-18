// CareAI Configuration
module.exports = {
  PORT: process.env.PORT || 3000,
  DB_PATH: process.env.DB_PATH || './data/careai.db',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',

  // Physiological bounds for pediatric patients
  WEIGHT_MIN_KG: 0.5,
  WEIGHT_MAX_KG: 150,
  HEIGHT_MIN_CM: 30,
  HEIGHT_MAX_CM: 200,

  // Unit conversion factors
  LB_TO_KG: 0.453592,
  KG_TO_LB: 2.20462,
  M_TO_CM: 100,
  IN_TO_CM: 2.54,

  // Validation thresholds
  ZSCORE_EXTREME_LOW: -5,
  ZSCORE_EXTREME_HIGH: 5,
  MAX_WEIGHT_CHANGE_PERCENT_PER_DAY: 5, // >5% per day is suspicious
  DUPLICATE_CONSECUTIVE_DAYS_THRESHOLD: 2,
  CARRIED_FORWARD_THRESHOLD: 3,

  // Severity levels
  SEVERITY: {
    CRITICAL: 'critical',
    HIGH: 'high',
    WARNING: 'warning',
    INFO: 'info'
  }
};
