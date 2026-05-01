'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET all professors (public info only)
router.get('/', (req, res) => {
  const professors = db.prepare(`
    SELECT id, name, email, phone, office
    FROM users
    WHERE role = 'professor'
    ORDER BY name
  `).all();
  res.json(professors);
});

// GET single professor
router.get('/:id', (req, res) => {
  const professor = db.prepare(`
    SELECT id, name, email, phone, office
    FROM users
    WHERE id = ? AND role = 'professor'
  `).get(req.params.id);
  if (!professor) return res.status(404).json({ error: 'Professor not found' });

  // Include their classes
  const classes = db.prepare(`
    SELECT course_name, course_code, room, day_of_week, start_time, end_time, semester
    FROM schedule
    WHERE professor_id = ?
    ORDER BY CASE day_of_week WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END, start_time
  `).all(req.params.id);

  res.json({ ...professor, classes });
});

// POST add professor (admin only)
router.post('/', requireAdmin, (req, res) => {
  const bcrypt = require('bcryptjs');
  const { name, email, phone, office, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, phone, office)
    VALUES (?, ?, ?, 'professor', ?, ?)
  `).run(name.trim(), email.trim().toLowerCase(), hash, phone || null, office || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT update professor (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const { name, email, phone, office } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  // Check email uniqueness (excluding this user)
  const conflict = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.params.id);
  if (conflict) return res.status(409).json({ error: 'Email already in use' });

  db.prepare(`
    UPDATE users SET name = ?, email = ?, phone = ?, office = ?
    WHERE id = ? AND role = 'professor'
  `).run(name.trim(), email.trim().toLowerCase(), phone || null, office || null, req.params.id);
  res.json({ success: true });
});

// DELETE professor (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ? AND role = 'professor'").run(req.params.id);
  res.json({ success: true });
});

function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = router;
