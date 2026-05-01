'use strict';

const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── Sessions ─────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'dept-guide-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 } // 8 hours
}));

// ─── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Captive portal redirect ──────────────────────────────────────────────────
// Common captive portal check endpoints used by Android, iOS, Windows, macOS
const captivePortalPaths = [
  '/generate_204',
  '/gen_204',
  '/hotspot-detect.html',
  '/library/test/success.html',
  '/ncsi.txt',
  '/connecttest.txt',
  '/redirect',
  '/canonical.html'
];
captivePortalPaths.forEach(p => {
  app.get(p, (req, res) => res.redirect('/'));
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/professors', require('./routes/professors'));
app.use('/api/files', require('./routes/files'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/complaints', require('./routes/complaints'));

// ─── Serve SPA for all other GET requests ─────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Department Guide running at http://0.0.0.0:${PORT}`);
});

module.exports = app;
