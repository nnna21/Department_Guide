# Git Commit Messages — Department Guide System
# Use these commit messages when pushing to GitHub

# ─── Initial Setup ───────────────────────────────────────────
git init
git remote add origin https://github.com/nnna21/Department_Guide.git

# ─── Commit 1: Project Structure ─────────────────────────────
git add .gitignore README.md
git commit -m "docs: add comprehensive README and .gitignore

- Add full project documentation with hardware specs
- Add deployment guide step by step
- Add folder structure description
- Add package list with versions
- Add .gitignore for Python/Flask project"

# ─── Commit 2: Flask Application ─────────────────────────────
git add app.py
git commit -m "feat: add Flask web application (Department Guide System)

- Admin login with password hashing (werkzeug)
- Timetable management for CE, Cyber, IST departments
- Teacher directory management
- Announcement system
- Student file submission system
- Password-protected data reset to default backup
- Backup creation with timestamps"

# ─── Commit 3: HTML Templates ────────────────────────────────
git add templates/
git commit -m "feat: add Jinja2 HTML templates

- index.html: main landing page
- landing.html: student landing page
- admin_login.html: secure admin login
- admin_data.html: admin dashboard
- edit_teachers.html: teacher management UI
- edit_announcements.html: announcement management
- create_timetable.html: timetable creation
- edit_timetable.html: timetable editing
- submit.html: student file submission
- view_submissions.html: all submissions view
- my_submissions.html: student submissions view
- change_password.html: admin password change
- reset_confirm.html: password-protected reset confirmation"

# ─── Commit 4: Data Files ────────────────────────────────────
git add data/
git commit -m "feat: add JSON data storage files

- teachers.json: teacher records
- announcements.json: department announcements
- timetable_ce_A/B.json: CE department timetables
- timetable_cyber_A/B.json: Cyber department timetables
- timetable_ist_A/B.json: IST department timetables"

# ─── Commit 5: Router Configuration ─────────────────────────
git add router-config/
git commit -m "feat: add OpenWrt router configuration files

- captive_check.py: Flask captive portal on port 80
  Handles connectivity checks for Android/iOS/Windows/Xiaomi/Oppo/Vivo
- webapp.init: procd service for auto-starting Flask app
- captive.init: procd service for captive portal
- rc.local: iptables rules persistent across reboots
- rc.button.reset: reset button script
  Short press restores data, long press blocks factory reset
- dnsmasq.conf: DNS interception for captive portal
  Intercepts connectivity check domains for 10+ phone brands"

# ─── Commit 6: Documentation ─────────────────────────────────
git add docs/
git commit -m "docs: add technical feasibility report and project documents

- Feasibility_Report.pdf: complete technical feasibility study
  Covers all 12 deployment operations with charts and flowcharts
- Enhanced_Feasibility_Report.pdf: enhanced version
- Uses_Cases_and_design_analysis_Report.pdf: use cases and design"

# ─── Final Push ──────────────────────────────────────────────
git push -u origin main
