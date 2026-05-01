# templates/

This folder contains all HTML templates rendered by the Flask application using Jinja2.

## Files

| File | Route | Description |
|---|---|---|
| `index.html` | `/` | Main landing page shown to all users |
| `landing.html` | `/guide` | Student department guide page |
| `admin_login.html` | `/admin/login` | Secure admin login form |
| `admin_data.html` | `/admin` | Full admin dashboard |
| `edit_teachers.html` | `/admin/teachers` | Add/edit/delete teachers |
| `edit_announcements.html` | `/admin/announcements` | Manage announcements |
| `create_timetable.html` | `/admin/timetable/create` | Create new timetable |
| `edit_timetable.html` | `/admin/timetable/edit` | Edit existing timetable |
| `submit.html` | `/submit` | Student file submission form |
| `view_submissions.html` | `/admin/submissions` | Admin view all submissions |
| `my_submissions.html` | `/submissions` | Student view own submissions |
| `change_password.html` | `/admin/change-password` | Change admin password |
| `reset_confirm.html` | `/admin/reset-to-default` | Password-protected data reset |
