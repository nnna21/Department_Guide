# data/

JSON-based data storage for the Department Guide System.
No database required — all data stored as simple JSON files.

## Files

| File | Description |
|---|---|
| `config.json` | Admin credentials (password hash) |
| `teachers.json` | Teacher name, subject, contact info |
| `announcements.json` | Department announcements |
| `submissions.json` | Student submission records |
| `timetable_ce_A.json` | Computer Engineering Section A |
| `timetable_ce_B.json` | Computer Engineering Section B |
| `timetable_cyber_A.json` | Cyber Security Section A |
| `timetable_cyber_B.json` | Cyber Security Section B |
| `timetable_ist_A.json` | Information Systems Section A |
| `timetable_ist_B.json` | Information Systems Section B |

## Backup System

Backup folders are created automatically with timestamps:
```
data/
└── backup_20260424_222127/   ← timestamped backup
    ├── teachers.json
    ├── announcements.json
    └── timetable_*.json
```

Default backup stored at `/root/backup_default/` on the router.
