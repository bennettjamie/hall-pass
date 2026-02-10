# Hall Pass Data Protection Plan

## Problem Statement
Class data (rosters, attendance, layouts) is stored only in browser localStorage, which can be lost due to:
- Browser cache clearing
- Code bugs (what just happened)
- Browser crashes
- Device/browser switching
- Storage quota exceeded
- Accidental tab close during save

## Data to Protect
| Data Type | Criticality | Current Storage |
|-----------|-------------|-----------------|
| Student rosters | HIGH | localStorage |
| Attendance records | HIGH | localStorage |
| Late/tardy times | HIGH | localStorage |
| Hall pass history | HIGH | localStorage |
| Streak data | MEDIUM | localStorage |
| Seating layouts | MEDIUM | localStorage |
| Schedule settings | LOW | localStorage |

---

## Solution: Multi-Layer Protection

### Layer 1: Redundant Local Storage (Immediate)
- Save to both `localStorage` AND `IndexedDB`
- On load, check both sources, use most recent
- Survives partial storage clearing

### Layer 2: Auto-Backup Downloads (Immediate)
- **Daily auto-backup**: Download JSON backup file at end of each school day
- **Change-triggered backup**: After significant changes (attendance closed, new import)
- Files go to Downloads folder with timestamp: `hallpass-backup-2024-02-10.json`
- User can re-import these anytime

### Layer 3: Cloud Sync (Firebase) - Phase 2
- Already have Firebase project (`hall-pass-edu`)
- Sync class data to Firestore on save
- Requires simple auth (could use anonymous auth initially)
- Enables multi-device access
- Teacher account = all data synced

### Layer 4: Export Options (Immediate)
- **One-click full backup**: Download everything as JSON
- **Attendance CSV export**: Daily/weekly attendance records
- **Excel export**: Formatted spreadsheet for admin reports

### Layer 5: Recovery & Warnings
- **Startup check**: Detect data loss, offer restore options
- **Close warning**: "You have unsaved changes" on tab close
- **Corruption detection**: Validate data integrity on load

---

## Implementation Priority

### Phase 1: Emergency Protection (This Week)
1. ✅ Add data loss detection (done)
2. Add "Download Backup" button in Settings
3. Add "Restore from Backup" option
4. Add auto-download at end of attendance period
5. Add beforeunload warning if unsaved changes

### Phase 2: Robust Storage (Next Week)
1. Add IndexedDB as secondary storage
2. Add periodic auto-save (every 5 minutes)
3. Add data versioning (track schema changes)
4. Add integrity checks on load

### Phase 3: Cloud Sync (Future)
1. Firebase anonymous auth
2. Firestore data sync
3. Conflict resolution
4. Multi-device support

---

## Backup File Format

```json
{
  "version": "1.0",
  "exportedAt": "2024-02-10T15:30:00Z",
  "data": {
    "allClasses": { ... },
    "classAssignments": { ... },
    "attendanceHistory": { ... },
    "hallPassHistory": { ... },
    "settings": { ... },
    "schedule": { ... }
  }
}
```

---

## CSV Export Format (Attendance)

```csv
Date,Period,Class,Student,Status,CheckInTime,Notes
2024-02-10,1,CLE10-04,Theogene V.,ontime,08:32:15,
2024-02-10,1,CLE10-04,Aylar M.,late,08:47:22,+15min
2024-02-10,1,CLE10-04,Thomas T.,absent,,
```

---

## User-Facing Changes

### Settings Panel Additions
- **📥 Backup & Restore** section
  - "Download Full Backup" button
  - "Restore from Backup" file picker
  - "Export Attendance (CSV)" button
  - "Auto-backup: Daily" toggle

### Status Bar Addition
- Small cloud/save icon showing sync status
- Green = saved, Yellow = pending, Red = error

### End of Class Prompt
When attendance is closed:
> "Attendance saved! Download backup? [Download] [Skip]"

---

## Code Safety Rules (Prevent Future Bugs)

1. **NEVER set `students = []` or `allClasses = {}` except in explicit delete functions**
2. **Always save to localStorage IMMEDIATELY after any data change**
3. **Add `try/catch` around ALL localStorage operations**
4. **Log all save/load operations for debugging**
5. **Unit tests for data persistence functions**

---

## Recovery Procedure (For Users)

If data is lost:
1. Check Downloads folder for recent `hallpass-backup-*.json`
2. Settings → Restore from Backup
3. If no backup: re-import class rosters (schedule settings preserved)
4. Contact support with browser console logs
