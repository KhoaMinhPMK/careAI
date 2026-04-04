/**
 * AI Agent Chat Page Logic
 */

let conversationHistory = [];
let selectedPatientId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadPatientSelector();
  document.getElementById('chat-input').focus();
});

async function loadPatientSelector() {
  try {
    const data = await apiGet('/patients');
    const selector = document.getElementById('patient-selector');
    selector.innerHTML = '<option value="">Select a patient...</option>' +
      data.patients.map(p =>
        `<option value="${p.id}">${(p.name || '').toUpperCase()} (${p.medical_record_number}) — ${p.ward}</option>`
      ).join('');
  } catch (error) {
    console.error('Load patients error:', error);
  }
}

function onPatientSelect() {
  const selector = document.getElementById('patient-selector');
  selectedPatientId = selector.value ? parseInt(selector.value) : null;

  if (selectedPatientId) {
    const name = selector.options[selector.selectedIndex].text.split(' (')[0];
    addMessage('assistant', `Now discussing: **${name}**. Ask me anything about their data, alerts, or nutritional status.`);
  }
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  addMessage('user', message);

  // Typing indicator
  const typingId = 'typing-' + Date.now();
  addMessage('assistant', 'Thinking...', typingId, true);

  try {
    const result = await apiPost('/agent/chat', {
      message,
      patient_id: selectedPatientId,
      conversation_history: conversationHistory
    });

    conversationHistory.push({ role: 'user', content: message });
    conversationHistory.push({ role: 'assistant', content: result.response });

    removeMessage(typingId);
    addMessage('assistant', result.response);

    // Show mode indicator
    if (result.mode === 'fallback') {
      const lastMsg = document.querySelector('#chat-messages .chat-message:last-child');
      if (lastMsg) {
        lastMsg.innerHTML += '<div style="margin-top: 12px; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 8px;">Demo mode - Set GROQ_API_KEY for full AI</div>';
      }
    }
  } catch (error) {
    removeMessage(typingId);
    addMessage('assistant', `Error: ${error.message}. Please try again.`);
  }

  input.focus();
}

function addMessage(role, content, id = null, isTyping = false) {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-message ${role}`;
  if (id) div.id = id;
  if (isTyping) div.style.opacity = '0.6';

  div.innerHTML = role === 'user' ? escapeHtml(content) : renderMarkdown(content);
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function removeMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Quick suggestion buttons
const suggestions = [
  'Summarize this patient',
  'Explain the active alerts',
  'Show weight analysis',
  'What are the growth concerns?'
];
