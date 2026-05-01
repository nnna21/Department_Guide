# Department Guide

A real-life offline web application that helps students, professors, and visitors navigate their department. Hosted on a custom OpenWrt router — no internet or domain needed.

## Features

| Module | Description |
|--------|-------------|
| 📢 **Notices** | Important announcements with priority levels (normal / important / urgent) |
| 📅 **Schedule / Timetable** | Weekly class timetable with day and semester filters |
| 👩‍🏫 **Faculty Directory** | Professor contact info (email, phone, office) with per-professor schedule |
| 📁 **File Sharing** | Upload and download documents, lecture notes, forms, policies (up to 50 MB) |
| 📝 **Applications** | Submit leave requests, transcripts, certificates, enrolment and more |
| 🗣️ **Complaints & Issues** | Report academic, infrastructure, staff or admin issues |
| ⚙️ **Admin Panel** | Manage applications, complaints, faculty and notices |
| 🌐 **Captive Portal** | Automatic redirect for Android / iOS / Windows / macOS portal checks |

## Quick Start

```bash
# Install dependencies
npm install

# Start the server (default port 3000)
npm start

# Or choose a port
PORT=80 npm start
```

Open `http://<router-ip>` (or `http://localhost:3000` for local testing).

### Default Admin Credentials

| Email | Password |
|-------|----------|
| `admin@department.local` | `admin123` |

> **Change the admin password immediately** via the database after first login.

## OpenWrt Deployment

1. Install Node.js on the router:
   ```sh
   opkg update && opkg install node node-npm
   ```
2. Copy this project to `/opt/department_guide/`.
3. Run `npm install --omit=dev` inside the folder.
4. Create an init script at `/etc/init.d/dept_guide`:
   ```sh
   #!/bin/sh /etc/rc.common
   START=99
   start() { cd /opt/department_guide && PORT=80 node server.js & }
   stop()  { killall node; }
   ```
5. Enable: `chmod +x /etc/init.d/dept_guide && /etc/init.d/dept_guide enable`.
6. Configure the router's captive portal / DHCP to point to this server's IP.

## Project Structure

```
Department_Guide/
├── server.js          # Express app entry-point + captive portal redirects
├── database/
│   └── db.js          # SQLite schema, seed data
├── routes/
│   ├── auth.js        # Login / logout / session
│   ├── notices.js     # Announcements CRUD
│   ├── schedule.js    # Class timetable CRUD
│   ├── professors.js  # Faculty directory CRUD
│   ├── files.js       # File upload / download
│   ├── applications.js # Application submissions
│   └── complaints.js  # Complaint submissions
├── public/
│   ├── index.html     # Single-page app shell
│   ├── css/style.css  # Responsive styles
│   └── js/app.js      # Frontend logic
├── uploads/           # Uploaded files (git-ignored)
├── data/              # SQLite database (git-ignored)
└── test/
    └── basic.test.js  # Integration tests
```

## Running Tests

```bash
npm test
```

## Tech Stack

- **Backend**: Node.js + Express 5
- **Database**: SQLite via `better-sqlite3`
- **Auth**: Session-based (`express-session` + `bcryptjs`)
- **File uploads**: `multer` 2.x
- **Frontend**: Vanilla HTML / CSS / JS (no build step, works offline)

