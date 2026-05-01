'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET all notices (newest first)
router.get('/', (req, res) => {
  const notices = db.prepare(`
    SELECT n.*, u.name AS author_name
    FROM notices n
    JOIN users u ON u.id = n.author_id
    ORDER BY n.created_at DESC
  `).all();
  res.json(notices);
});

// GET single notice
router.get('/:id', (req, res) => {
  const notice = db.prepare(`
    SELECT n.*, u.name AS author_name
    FROM notices n
    JOIN users u ON u.id = n.author_id
    WHERE n.id = ?
  `).get(req.params.id);
  if (!notice) return res.status(404).json({ error: 'Notice not found' });
  res.json(notice);
});

// POST create notice (admin only)
router.post('/', requireAdmin, (req, res) => {
  const { title, body, priority = 'normal' } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });
  const allowed = ['normal', 'important', 'urgent'];
  if (!allowed.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

  const result = db.prepare(`
    INSERT INTO notices (title, body, priority, author_id)
    VALUES (?, ?, ?, ?)
  `).run(title.trim(), body.trim(), priority, req.session.userId);
  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT update notice (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const { title, body, priority } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });
  const allowed = ['normal', 'important', 'urgent'];
  if (priority && !allowed.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

  db.prepare(`
    UPDATE notices SET title = ?, body = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title.trim(), body.trim(), priority || 'normal', req.params.id);
  res.json({ success: true });
});

// DELETE notice (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM notices WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = router;
