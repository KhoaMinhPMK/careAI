/**
 * Agent Chat API Routes
 */
const express = require('express');
const router = express.Router();
const { processMessage } = require('../agent/agent-core');

// POST /api/agent/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, patient_id, conversation_history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await processMessage(
      message,
      patient_id || null,
      conversation_history || []
    );

    res.json({
      response: result.response,
      mode: result.mode,
      patient: result.patient,
      intent: result.intent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({
      response: 'Sorry, I encountered an error processing your request. Please try again.',
      mode: 'error',
      error: error.message
    });
  }
});

module.exports = router;
