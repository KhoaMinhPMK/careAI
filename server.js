const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./backend/config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Serve icon SVGs from /icons/
app.use('/icons', express.static(path.join(__dirname, 'icons')));

// Serve locale JSON files
app.use('/locales', express.static(path.join(__dirname, 'public', 'locales')));

// API Routes
app.use('/api/dashboard', require('./backend/routes/dashboard'));
app.use('/api/patients', require('./backend/routes/patients'));
app.use('/api/validation', require('./backend/routes/validation'));
app.use('/api/fhir', require('./backend/routes/fhir'));
app.use('/api/agent', require('./backend/routes/agent'));
app.use('/api/medical-record', require('./backend/routes/medical-record'));

// Root redirect to login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Catch-all: serve the requested HTML file or fallback to login
app.get('*', (req, res) => {
  const htmlFile = path.join(__dirname, 'public', req.path.endsWith('.html') ? req.path : 'login.html');
  res.sendFile(htmlFile, (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(config.PORT, () => {
  console.log(`
  ========================================
     CareAI Server Running
     Local:  http://localhost:${config.PORT}
     API:    http://localhost:${config.PORT}/api
  ========================================
  `);
});
