const express = require('express');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Express JSON middleware with error handling for malformed JSON
app.use(express.json());

// Health check endpoints (Unauthenticated)
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized Error Handling Middleware
// Ensures no raw stack traces or database errors are leaked to the client
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Handle JSON parsing syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }

  // Log server-side for debugging
  console.error('Unhandled server error:', err.message);

  // Return generic, sanitized error response
  return res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
