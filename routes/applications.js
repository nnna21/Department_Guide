'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');

const VALID_TYPES = ['leave_request', 'certificate', 'transcript', 'enrollment', 'other'];

// GET applications (admin sees all; others see their own by email query param)
router.get('/', (req, res) => {
  if (req.session.role === 'admin') {
    const apps = db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all();
    return res.json(apps);
  }
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Provide your email to check application status' });
  const apps = db.prepare('SELECT * FROM applications WHERE applicant_email = ? ORDER BY created_at DESC').all(email.toLowerCase());
  res.json(apps);
});

// GET single application
router.get('/:id', (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  // Non-admins must provide matching email
  if (req.session.role !== 'admin' && req.query.email !== app.applicant_email) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  res.json(app);
});

// POST submit application (public)
router.post('/', (req, res) => {
  const { applicant_name, applicant_email, type, subject, body } = req.body;
  if (!applicant_name || !applicant_email || !type || !subject || !body) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid application type' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(applicant_email)) return res.status(400).json({ error: 'Invalid email address' });

  const result = db.prepare(`
    INSERT INTO applications (applicant_name, applicant_email, type, subject, body)
    VALUES (?, ?, ?, ?, ?)
  `).run(applicant_name.trim(), applicant_email.trim().toLowerCase(), type, subject.trim(), body.trim());
  res.status(201).json({ id: result.lastInsertRowid, message: 'Application submitted successfully' });
});

// PUT update status (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const { status, admin_notes } = req.body;
  const allowed = ['pending', 'reviewed', 'approved', 'rejected'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  db.prepare(`
    UPDATE applications SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, admin_notes || null, req.params.id);
  res.json({ success: true });
});

function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = router;
