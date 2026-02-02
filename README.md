# 🎟️ Hall Pass

Classroom attendance & hall pass manager for high school teachers.

## Features

- **Self-Service Check-In** — Students tap their caricature to mark attendance
- **Two-Mode Feedback** — Fun sounds pre-bell, silent visuals during class  
- **Live Countdown** — Synced to device clock (matches student phones)
- **Hall Pass Queue** — 1 out + 2 waiting, committed return times, reason tags
- **Streak Gamification** — Milestone celebrations, streak protection (10+)
- **Display/Projector Mode** — Clean fullscreen view for classroom screens
- **Offline-First** — All data stored locally via IndexedDB
- **Privacy-Focused** — First name + last initial only, no cloud required

## Quick Start

1. Open `index.html` in any modern browser
2. Import your class roster (CSV: First Name, Last Name)
3. Upload caricature images for each student
4. Arrange the seating grid to match your classroom
5. Set the day type and period
6. Ready to go!

## Bell Schedule

Pre-configured for Britannia Secondary School (VSB), including:
- Monday (No FIT)
- Tuesday/Thursday (PM FIT)
- Wednesday/Friday (AM FIT)
- Collab Days (AM/PM)
- Early Dismissal

## Tech Stack

- Plain HTML/CSS/JavaScript (no frameworks)
- IndexedDB for local data persistence
- Web Audio API for sounds
- Device system clock for time sync

## Data Privacy

- Only first names and last initials are stored
- Full last names are discarded after initial import
- Caricatures stored locally (base64)
- No data leaves the device
- JSON backup/restore for portability

## Deployment

Just serve the files statically. No backend required.

```bash
# Local development
npx serve .

# Or just open index.html directly
```

## License

MIT

---

Built with ❤️ for teachers who want accountability without the hassle.
