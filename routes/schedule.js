'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET full timetable (optionally filtered by day or semester)
router.get('/', (req, res) => {
  const { day, semester } = req.query;
  let query = `
    SELECT s.*, u.name AS professor_name
    FROM schedule s
    LEFT JOIN users u ON u.id = s.professor_id
  `;
  const params = [];
  const conditions = [];
  if (day) { conditions.push('s.day_of_week = ?'); params.push(day); }
  if (semester) { conditions.push('s.semester = ?'); params.push(semester); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += " ORDER BY CASE s.day_of_week WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END, s.start_time";

  res.json(db.prepare(query).all(...params));
});

// GET single entry
router.get('/:id', (req, res) => {
  const entry = db.prepare(`
    SELECT s.*, u.name AS professor_name
    FROM schedule s
    LEFT JOIN users u ON u.id = s.professor_id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Schedule entry not found' });
  res.json(entry);
});

// POST create entry (admin only)
router.post('/', requireAdmin, (req, res) => {
  const { course_name, course_code, professor_id, room, day_of_week, start_time, end_time, semester } = req.body;
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  if (!course_name || !course_code || !room || !day_of_week || !start_time || !end_time || !semester) {
    return res.status(400).json({ error: 'All fields except professor_id are required' });
  }
  if (!days.includes(day_of_week)) return res.status(400).json({ error: 'Invalid day_of_week' });

  const result = db.prepare(`
    INSERT INTO schedule (course_name, course_code, professor_id, room, day_of_week, start_time, end_time, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(course_name.trim(), course_code.trim(), professor_id || null, room.trim(), day_of_week, start_time, end_time, semester.trim());
  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT update entry (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const { course_name, course_code, professor_id, room, day_of_week, start_time, end_time, semester } = req.body;
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  if (!course_name || !course_code || !room || !day_of_week || !start_time || !end_time || !semester) {
    return res.status(400).json({ error: 'All fields except professor_id are required' });
  }
  if (!days.includes(day_of_week)) return res.status(400).json({ error: 'Invalid day_of_week' });

  db.prepare(`
    UPDATE schedule
    SET course_name=?, course_code=?, professor_id=?, room=?, day_of_week=?, start_time=?, end_time=?, semester=?
    WHERE id=?
  `).run(course_name.trim(), course_code.trim(), professor_id || null, room.trim(), day_of_week, start_time, end_time, semester.trim(), req.params.id);
  res.json({ success: true });
});

// DELETE entry (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM schedule WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = router;
