'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { createRateLimiter } = require('./rateLimiter');

const downloadLimiter = createRateLimiter({ windowMs: 60_000, max: 60,
  message: 'Too many download requests, please slow down.' });
const uploadLimiter = createRateLimiter({ windowMs: 60_000, max: 20,
  message: 'Too many upload requests, please slow down.' });

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    // Block executable files
    const blocked = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.com'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (blocked.includes(ext)) {
      return cb(new Error('Executable files are not allowed'));
    }
    cb(null, true);
  }
});

// GET list files (optionally filter by category)
router.get('/', (req, res) => {
  const { category } = req.query;
  let query = `
    SELECT f.id, f.title, f.description, f.original_name, f.file_size, f.mime_type,
           f.category, f.created_at, u.name AS uploader_name
    FROM files f
    JOIN users u ON u.id = f.uploader_id
  `;
  const params = [];
  if (category) { query += ' WHERE f.category = ?'; params.push(category); }
  query += ' ORDER BY f.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// GET download a file
router.get('/:id/download', downloadLimiter, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  const filePath = path.join(UPLOAD_DIR, file.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing from storage' });
  res.download(filePath, file.original_name);
});

// POST upload file (logged-in users)
router.post('/', requireAuth, uploadLimiter, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { title, description, category = 'general' } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const result = db.prepare(`
    INSERT INTO files (title, description, filename, original_name, file_size, mime_type, uploader_id, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    description ? description.trim() : null,
    req.file.filename,
    req.file.originalname,
    req.file.size,
    req.file.mimetype,
    req.session.userId,
    category
  );
  res.status(201).json({ id: result.lastInsertRowid });
});

// DELETE file (admin or the uploader)
router.delete('/:id', requireAuth, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  if (req.session.role !== 'admin' && file.uploader_id !== req.session.userId) {
    return res.status(403).json({ error: 'Not authorized to delete this file' });
  }

  const filePath = path.join(UPLOAD_DIR, file.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 50 MB)' });
  if (err.message === 'Executable files are not allowed') return res.status(400).json({ error: err.message });
  next(err);
});

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Login required' });
  }
  next();
}

module.exports = router;
