/**
 * AI Agent: Core Logic
 */
const { callGroq } = require('./groq-client');
const { SYSTEM_PROMPT, FALLBACK_RESPONSES, buildPatientContext } = require('./prompts');
const db = require('../database');

/**
 * Process a chat message and return the agent's response
 */
async function processMessage(userMessage, patientId = null, conversationHistory = []) {
  // Build patient context if a patient is selected
  let patientContext = '';
  let patient = null;

  if (patientId) {
    patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (patient) {
      const observations = db.prepare('SELECT * FROM observations WHERE patient_id = ? ORDER BY effective_date DESC LIMIT 20').all(patientId);
      const alerts = db.prepare('SELECT * FROM alerts WHERE patient_id = ? AND resolved = 0 ORDER BY created_at DESC LIMIT 15').all(patientId);
      const notes = db.prepare('SELECT * FROM clinical_notes WHERE patient_id = ? ORDER BY effective_date DESC LIMIT 5').all(patientId);
      patientContext = buildPatientContext(patient, observations, alerts, notes);
    }
  }

  // Detect intent for fallback mode
  const intent = detectIntent(userMessage);

  // Try Groq API first
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + patientContext },
    ...conversationHistory.slice(-10),
    { role: 'user', content: userMessage }
  ];

  const aiResponse = await callGroq(messages);

  if (aiResponse) {
    return {
      response: aiResponse,
      mode: 'ai',
      patient: patient ? { id: patient.id, name: patient.name } : null,
      intent
    };
  }

  // Fallback mode — pre-configured responses
  const fallbackResponse = generateFallback(intent, userMessage, patient, patientId);
  return {
    response: fallbackResponse,
    mode: 'fallback',
    patient: patient ? { id: patient.id, name: patient.name } : null,
    intent
  };
}

function detectIntent(message) {
  const lower = message.toLowerCase();

  if (/^(hi|hello|hey|xin chào|chào)/.test(lower)) return 'greeting';
  if (/alert|flag|issue|problem|cảnh báo/.test(lower)) return 'explain_alerts';
  if (/summary|summarize|tổng hợp|tóm tắt/.test(lower)) return 'summarize';
  if (/z-?score|percentile|growth|tăng trưởng/.test(lower)) return 'growth_analysis';
  if (/weight|cân nặng|gain|loss/.test(lower)) return 'weight_analysis';
  if (/note|ghi chú|document/.test(lower)) return 'note_analysis';
  if (/fhir|export|xuất/.test(lower)) return 'fhir_info';
  if (/validate|check|kiểm tra/.test(lower)) return 'validate';
  return 'general';
}

function generateFallback(intent, message, patient, patientId) {
  if (intent === 'greeting') return FALLBACK_RESPONSES.greeting;
  if (!patientId) return FALLBACK_RESPONSES.no_patient;
  if (!patient) return `Patient with ID ${patientId} not found in the database.`;

  const observations = db.prepare('SELECT * FROM observations WHERE patient_id = ? ORDER BY effective_date DESC').all(patientId);
  const alerts = db.prepare('SELECT * FROM alerts WHERE patient_id = ? AND resolved = 0').all(patientId);

  switch (intent) {
    case 'summarize': {
      const weights = observations.filter(o => o.type === 'weight');
      const latestWeight = weights[0];
      const firstWeight = weights[weights.length - 1];
      let summary = `## Patient Summary: ${patient.name}\n\n`;
      summary += `**MRN:** ${patient.medical_record_number} | **Age:** ${patient.date_of_birth} | **Ward:** ${patient.ward}\n\n`;
      if (latestWeight && firstWeight) {
        const change = latestWeight.value - firstWeight.value;
        summary += `**Weight trend:** ${firstWeight.value} → ${latestWeight.value} kg (${change > 0 ? '+' : ''}${change.toFixed(1)} kg)\n`;
      }
      summary += `**Active alerts:** ${alerts.length} (${alerts.filter(a => a.severity === 'critical').length} critical)\n`;
      summary += `**Total measurements:** ${observations.length}\n`;
      summary += `\n*⚠️ Demo mode — set GROQ_API_KEY for detailed AI analysis*`;
      return summary;
    }

    case 'explain_alerts': {
      if (alerts.length === 0) return `No active alerts for ${patient.name}. All measurements appear within normal bounds.`;
      let resp = `## Active Alerts for ${patient.name}\n\n`;
      for (const a of alerts.slice(0, 5)) {
        const icon = { critical: '🔴', high: '🟠', warning: '🟡', info: '🔵' }[a.severity] || '⚪';
        resp += `### ${icon} ${a.alert_type}\n${a.message}\n\n`;
        if (a.explanation) resp += `> ${a.explanation}\n\n`;
      }
      return resp;
    }

    case 'growth_analysis':
    case 'weight_analysis': {
      const weights = observations.filter(o => o.type === 'weight');
      if (weights.length === 0) return `No weight data available for ${patient.name}.`;
      let resp = `## Weight Analysis: ${patient.name}\n\n`;
      resp += `| Date | Weight (kg) | Z-score | Interpretation |\n|------|------------|---------|----------------|\n`;
      for (const w of weights.slice(0, 10)) {
        resp += `| ${w.effective_date} | ${w.value} | ${w.zscore || 'N/A'} | ${w.zscore_interpretation || '-'} |\n`;
      }
      return resp;
    }

    default:
      return FALLBACK_RESPONSES.no_api_key;
  }
}

module.exports = { processMessage };
