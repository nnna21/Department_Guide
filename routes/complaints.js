'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { createRateLimiter } = require('./rateLimiter');

const VALID_CATEGORIES = ['academic', 'infrastructure', 'staff', 'administration', 'other'];

const submitLimiter = createRateLimiter({ windowMs: 60_000, max: 10,
  message: 'Too many submissions, please slow down.' });

// GET complaints (admin sees all; public can check by email)
router.get('/', (req, res) => {
  if (req.session.role === 'admin') {
    const complaints = db.prepare('SELECT * FROM complaints ORDER BY created_at DESC').all();
    return res.json(complaints);
  }
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Provide your email to check complaint status' });
  const complaints = db.prepare('SELECT * FROM complaints WHERE reporter_email = ? ORDER BY created_at DESC').all(email.toLowerCase());
  res.json(complaints);
});

// GET single complaint
router.get('/:id', (req, res) => {
  const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
  if (req.session.role !== 'admin' && req.query.email !== complaint.reporter_email) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  res.json(complaint);
});

// POST submit complaint (public)
router.post('/', submitLimiter, (req, res) => {
  const { reporter_name, reporter_email, category, subject, description } = req.body;
  if (!reporter_name || !reporter_email || !category || !subject || !description) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });

  const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,253}$/;
  if (!emailRegex.test(reporter_email) || !reporter_email.slice(reporter_email.indexOf('@') + 1).includes('.')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const result = db.prepare(`
    INSERT INTO complaints (reporter_name, reporter_email, category, subject, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(reporter_name.trim(), reporter_email.trim().toLowerCase(), category, subject.trim(), description.trim());
  res.status(201).json({ id: result.lastInsertRowid, message: 'Complaint submitted successfully' });
});

// PUT update status (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const { status, admin_notes } = req.body;
  const allowed = ['open', 'in_progress', 'resolved', 'closed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  db.prepare(`
    UPDATE complaints SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
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
