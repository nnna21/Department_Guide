'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'department.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    email     TEXT    NOT NULL UNIQUE,
    password  TEXT    NOT NULL,
    role      TEXT    NOT NULL CHECK(role IN ('admin','professor','student','visitor')),
    phone     TEXT,
    office    TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notices (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL,
    priority   TEXT    NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','important','urgent')),
    author_id  INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schedule (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    course_name TEXT    NOT NULL,
    course_code TEXT    NOT NULL,
    professor_id INTEGER REFERENCES users(id),
    room        TEXT    NOT NULL,
    day_of_week TEXT    NOT NULL CHECK(day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
    start_time  TEXT    NOT NULL,
    end_time    TEXT    NOT NULL,
    semester    TEXT    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS files (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    description  TEXT,
    filename     TEXT    NOT NULL,
    original_name TEXT   NOT NULL,
    file_size    INTEGER NOT NULL,
    mime_type    TEXT    NOT NULL,
    uploader_id  INTEGER NOT NULL REFERENCES users(id),
    category     TEXT    NOT NULL DEFAULT 'general',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS applications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    applicant_name TEXT  NOT NULL,
    applicant_email TEXT NOT NULL,
    type         TEXT    NOT NULL,
    subject      TEXT    NOT NULL,
    body         TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewed','approved','rejected')),
    admin_notes  TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_name  TEXT  NOT NULL,
    reporter_email TEXT  NOT NULL,
    category     TEXT    NOT NULL,
    subject      TEXT    NOT NULL,
    description  TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
    admin_notes  TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── Seed admin user ──────────────────────────────────────────────────────────

const bcrypt = require('bcryptjs');

const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!existingAdmin) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (name, email, password, role, phone, office)
    VALUES (?, ?, ?, 'admin', ?, ?)
  `).run('Administrator', 'admin@department.local', hash, '000-0000', 'Admin Office');

  // Seed a professor
  const profHash = bcrypt.hashSync('prof123', 10);
  const profResult = db.prepare(`
    INSERT INTO users (name, email, password, role, phone, office)
    VALUES (?, ?, ?, 'professor', ?, ?)
  `).run('Dr. Alice Johnson', 'alice@department.local', profHash, '555-0101', 'Room 204');

  // Seed another professor
  const prof2Result = db.prepare(`
    INSERT INTO users (name, email, password, role, phone, office)
    VALUES (?, ?, ?, 'professor', ?, ?)
  `).run('Dr. Bob Smith', 'bob@department.local', profHash, '555-0102', 'Room 206');

  // Seed schedule entries
  db.prepare(`
    INSERT INTO schedule (course_name, course_code, professor_id, room, day_of_week, start_time, end_time, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('Introduction to Computer Science', 'CS101', profResult.lastInsertRowid, 'Lab A', 'Monday', '08:00', '10:00', 'Fall 2025');

  db.prepare(`
    INSERT INTO schedule (course_name, course_code, professor_id, room, day_of_week, start_time, end_time, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('Data Structures', 'CS201', profResult.lastInsertRowid, 'Room 101', 'Wednesday', '10:00', '12:00', 'Fall 2025');

  db.prepare(`
    INSERT INTO schedule (course_name, course_code, professor_id, room, day_of_week, start_time, end_time, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('Calculus II', 'MATH202', prof2Result.lastInsertRowid, 'Room 302', 'Tuesday', '09:00', '11:00', 'Fall 2025');

  // Seed a notice
  const adminId = db.prepare('SELECT id FROM users WHERE role = ?').get('admin').id;
  db.prepare(`
    INSERT INTO notices (title, body, priority, author_id)
    VALUES (?, ?, ?, ?)
  `).run(
    'Welcome to Department Guide',
    'This system helps students, professors, and visitors navigate department resources. Use the menu to explore schedules, contact faculty, share files, and more.',
    'important',
    adminId
  );

  db.prepare(`
    INSERT INTO notices (title, body, priority, author_id)
    VALUES (?, ?, ?, ?)
  `).run(
    'Mid-Term Examinations Schedule',
    'Mid-term examinations will be held from November 10–15. Please check your individual course schedules for exact times and venues.',
    'urgent',
    adminId
  );
}

module.exports = db;
