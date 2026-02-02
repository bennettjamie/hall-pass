# Hall Pass + Reflect — Product Requirements Document

## Product Overview

**Product Name:** Hall Pass (working title)
**Target Users:** High school students in CLE 10 (Career Life Education) and similar courses
**Platform:** Web app optimized for tablet (classroom kiosk) + student devices (reflection/goals)
**Core Philosophy:** Treat students as young professionals learning real-world skills including self-management, goal-setting, and project management using Agile/Scrum methodologies.

---

## Problem Statement

Students need a lightweight system to:
1. Track attendance and hall pass usage without teacher micromanagement
2. Regularly reflect on their professionalism habits
3. Set, track, and achieve personal goals using professional frameworks
4. Build incremental success through weekly sprint cycles
5. Visualize their progress in an engaging, professional way

Teachers need:
1. Accurate attendance data formatted for MyEd BC reporting
2. Documentation of hall pass usage patterns
3. Minimal daily overhead — the system runs itself

---

## User Personas

### Student (Primary User)
- High school student (Grade 10 typically)
- Varying levels of self-management skills
- May have "phone challenges" (distraction issues)
- Wants autonomy and to be treated as a young professional
- Motivated by visual progress and streaks

### Teacher (Admin User)
- Needs quick attendance snapshots
- Wants to identify patterns (chronic lateness, hall pass abuse)
- Exports data to MyEd BC format (sorted: Last Initial, First Name — e.g., "B, Jamie")
- Doesn't want to police — wants systems that encourage self-regulation

---

## Core Features

### Module 1: Attendance (Tablet Kiosk)

**Sign-In Flow:**
1. Student approaches tablet at start of class
2. Taps their name from class roster (First Name + Last Initial display)
3. Confirmation screen appears showing their name prominently
4. Student taps "That's Me" to confirm
5. System records timestamp, calculates on-time vs. late based on bell schedule

**Anti-Gaming Measures:**
- Two-step confirmation creates friction for buddy sign-ins
- All sign-ins logged with timestamps for audit
- Photo confirmation is a future option if privacy allows

**Streak Tracking:**
- Consecutive on-time days tracked
- Encouraging feedback: "4 days on time! 🔥"
- Streaks visible to student, aggregate data to teacher

### Module 2: Hall Pass (Tablet Kiosk)

**Request Flow:**
1. Hall pass only available during "middle" of class (not first/last 10 min — configurable)
2. Student taps "Request Hall Pass"
3. If queue is empty: Pass granted, timer starts, student shown "You're Out — Tap when you return"
4. If someone is out: Student sees "Jamie is out — ETD: ~3 min" and can join queue
5. On return: Student taps "I'm Back", system records duration

**Accountability Features:**
- Duration logged per student
- Weekly hall pass count tracked
- Peer pressure: Long trips visible ("Jamie: 8 min" when next person is waiting)
- No hard time limits (passive tracking, not policing)

### Module 3: Weekly Reflection (Student Device — Friday)

**Professionalism Self-Rating:**
Students rate themselves 1-5 on each dimension for the week:

| Dimension | Description |
|-----------|-------------|
| On Time | Arrived before the bell |
| Time on Task | Stayed focused during work time |
| Helping Others | Supported classmates when able |
| Appropriate Volume | Voice level matched the activity |
| Active Listening | Paid attention during instruction/discussion |
| Respectful Communication | Did not talk over others |
| Self-Regulation | Managed impulsive reactions |

**Goal Review:**
- See this week's goals (auto-tracked + self-tracked)
- Check off completed tasks
- Note what helped / what got in the way

**Draft Next Week:**
- Drag tasks from Backlog → This Week
- Set new attendance/hall pass goals if desired
- Reflection auto-saves as draft

### Module 4: Goal Commitment (Student Device — Monday)

**Sprint Planning:**
1. Student sees their Friday draft: "Here's what you planned:"
2. Review tasks in "This Week" column
3. Options: [Commit to This] or [Edit First]
4. Committed goals become the week's burndown baseline

**Encouraging Incremental Success:**
- System suggests achievable loads based on past velocity
- "Last week you completed 8 points. You've planned 12 — ambitious! 💪"
- Or: "You've planned 4 points. Room for one more? Your backlog has some small wins."

### Module 5: Kanban Board (Student Device — Ongoing)

**Columns:**
1. Backlog — Future tasks, someday goals
2. This Week — Committed sprint items
3. In Progress — Actively working on
4. Done — Completed (moves here manually or auto for tracked goals)

**Task Properties:**
- Title (required)
- Points: Small (1), Medium (2), Large (3) — represents effort
- Category: Personal Goal / Attendance / Hall Pass / Professionalism
- Parent Goal (optional): Links sub-tasks to larger goal

**Interactions:**
- Drag and drop between columns
- Tap to edit
- Swipe to delete (with confirm)

### Module 6: Burndown Chart (Student Device)

**Visual Display:**
- X-axis: Days of the week (Mon-Fri)
- Y-axis: Points remaining
- Ideal line: Straight diagonal from total points to zero
- Actual line: Updated as tasks complete

**Auto-Tracked Points:**
- Attendance: 1 point per day, burns when on-time (5 possible/week)
- Hall Pass: Configurable budget (e.g., 3/week), burns on use

**Self-Tracked Points:**
- Tasks checked off in Kanban board

**Interpretation Prompts:**
- "You're ahead of pace! 🎯"
- "Flat line Wed-Thu — what got in the way?"
- Weekly summary in Friday reflection

### Module 7: Admin Dashboard (Teacher Device)

**Attendance Snapshot:**
- Current class roster
- Who's signed in (✓), who's not (—), who's late (⏰)
- Sorted by: Last Initial, First Name (for MyEd BC matching)

**Export:**
- CSV export formatted for MyEd BC
- Date range selector
- Columns: Student Name (B, Jamie format), Date, Status (Present/Late/Absent)

**Hall Pass Report:**
- Weekly summary: Total passes, average duration, outliers
- Per-student breakdown (for documentation if needed)

**Reflection Completion:**
- Who submitted Friday reflection
- Who committed Monday goals
- Engagement tracking over time

---

## Data Model

```
/classes/{classId}/
├── name: "CLE 10 - Block A"
├── bellSchedule: { start: "09:00", end: "10:15", passBuffer: 10 }
└── students/
    └── {studentId}/
        ├── displayName: "Jamie B"
        ├── sortKey: "b_jamie"  // for MyEd BC ordering
        └── createdAt: timestamp

/students/{studentId}/
├── displayName: "Jamie B"
├── classes: ["classId1", "classId2"]
│
├── attendance/
│   └── {date}/  // "2025-01-27"
│       ├── signInTime: timestamp
│       ├── onTime: boolean
│       └── classId: "classId1"
│
├── hallPasses/
│   └── {passId}/
│       ├── date: "2025-01-27"
│       ├── outTime: timestamp
│       ├── inTime: timestamp | null
│       ├── duration: number (minutes)
│       └── classId: "classId1"
│
├── sprints/
│   └── {weekId}/  // "2025-W05"
│       ├── status: "draft" | "committed" | "reviewed"
│       ├── committedAt: timestamp | null
│       ├── reviewedAt: timestamp | null
│       │
│       ├── professionalism/
│       │   ├── onTime: 4
│       │   ├── timeOnTask: 3
│       │   ├── helpingOthers: 5
│       │   ├── volume: 4
│       │   ├── activeListening: 3
│       │   ├── respectfulComm: 4
│       │   └── selfRegulation: 4
│       │
│       └── reflection/
│           ├── wentWell: "string"
│           ├── challenges: "string"
│           └── nextWeekFocus: "string"
│
└── tasks/
    └── {taskId}/
        ├── title: "Finish resume draft"
        ├── points: 2  // 1=Small, 2=Medium, 3=Large
        ├── status: "backlog" | "thisWeek" | "inProgress" | "done"
        ├── category: "personal" | "attendance" | "hallpass" | "professionalism"
        ├── parentGoal: "goalId" | null
        ├── sprintWeek: "2025-W05" | null  // which week it's assigned to
        ├── completedAt: timestamp | null
        └── createdAt: timestamp

/goals/{goalId}/  // Larger multi-week goals
├── studentId: "studentId"
├── title: "Complete Resume"
├── description: "Professional resume for job applications"
├── targetDate: "2025-02-28"
├── status: "active" | "completed" | "paused"
├── progress: 0.25  // calculated from child tasks
└── createdAt: timestamp
```

---

## User Stories

### Epic 1: Attendance

**ATT-1: Sign In**
AS A student
I WANT TO tap my name and confirm my identity
SO THAT I can quickly sign in without teacher involvement

Acceptance Criteria:
- [ ] Student roster displays First Name + Last Initial
- [ ] Tapping name shows confirmation screen with name prominently displayed
- [ ] "That's Me" button records sign-in with timestamp
- [ ] System determines on-time vs late based on bell schedule
- [ ] Success feedback shown: "Welcome, Jamie! ✓ On time"

**ATT-2: Late Arrival**
AS A student arriving late
I WANT TO still sign in easily
SO THAT my attendance is recorded accurately

Acceptance Criteria:
- [ ] Same flow as on-time sign-in
- [ ] System auto-marks as "late" if after bell time
- [ ] Feedback: "Welcome, Jamie — marked late (9:07)"
- [ ] No judgment/shame, just factual

**ATT-3: Streak Display**
AS A student
I WANT TO see my on-time streak
SO THAT I'm motivated to maintain it

Acceptance Criteria:
- [ ] After sign-in, show current streak: "🔥 4 days on time!"
- [ ] Streak resets on late or absent day
- [ ] Personal best tracked: "Your record: 12 days"

**ATT-4: Admin Attendance View**
AS A teacher
I WANT TO see who's signed in at a glance
SO THAT I can take attendance quickly

Acceptance Criteria:
- [ ] List all students in class
- [ ] Status indicators: ✓ (on time), ⏰ (late), — (not signed in)
- [ ] Sorted by Last Initial, First Name
- [ ] Timestamp shown for each sign-in

**ATT-5: Export Attendance**
AS A teacher
I WANT TO export attendance to CSV
SO THAT I can enter it into MyEd BC

Acceptance Criteria:
- [ ] Date range picker
- [ ] Export format: "B, Jamie", "2025-01-27", "Present" (or "Late" or "Absent")
- [ ] One row per student per day
- [ ] Downloads as .csv file

### Epic 2: Hall Pass

**PASS-1: Request Pass**
AS A student
I WANT TO request a hall pass from the tablet
SO THAT I can leave class with documentation

Acceptance Criteria:
- [ ] "Hall Pass" button visible on tablet home screen
- [ ] Button disabled during first/last 10 min of class
- [ ] Tap shows confirmation: "Heading out? Tap to confirm"
- [ ] Confirm starts timer and shows "You're Out" screen

**PASS-2: Return from Pass**
AS A student returning from hall pass
I WANT TO check back in
SO THAT my time out is recorded

Acceptance Criteria:
- [ ] "I'm Back" button prominent on tablet
- [ ] Tap stops timer and records duration
- [ ] Shows feedback: "Back in 4 min — nice! ✓"
- [ ] Duration saved to student record

**PASS-3: Queue System**
AS A student
I WANT TO see if someone else is out and queue up
SO THAT I know when I can leave

Acceptance Criteria:
- [ ] If pass in use: Show "Jamie is out — ETD: ~3 min"
- [ ] "Join Queue" button adds student to waiting list
- [ ] When current student returns, next in queue is notified
- [ ] Queue position shown: "You're #2"

**PASS-4: Hall Pass Budget**
AS A student
I WANT TO see how many passes I've used this week
SO THAT I can manage my usage

Acceptance Criteria:
- [ ] Display: "Passes this week: 2 of 3"
- [ ] No hard block at limit (just tracking)
- [ ] Resets each Monday

**PASS-5: Hall Pass Report**
AS A teacher
I WANT TO see hall pass usage patterns
SO THAT I can identify students who may need support

Acceptance Criteria:
- [ ] Weekly summary: total passes, avg duration
- [ ] Per-student breakdown
- [ ] Flag outliers (e.g., >10 min average, >5 passes/week)
- [ ] Exportable for documentation

### Epic 3: Weekly Reflection (Friday)

**REFL-1: Professionalism Self-Rating**
AS A student
I WANT TO rate myself on professionalism dimensions
SO THAT I can honestly assess my week

Acceptance Criteria:
- [ ] 7 dimensions displayed with 1-5 scale each
- [ ] Tap to select rating (visual: stars, dots, or slider)
- [ ] Brief description of each dimension visible
- [ ] Auto-saves as user progresses

**REFL-2: Goal Review**
AS A student
I WANT TO see my goals and check off what I completed
SO THAT I can celebrate wins and note what's left

Acceptance Criteria:
- [ ] Kanban board shows "This Week" and "Done" columns
- [ ] Tap task to mark complete (moves to Done)
- [ ] Attendance/hall pass goals show auto-tracked data
- [ ] Summary: "You completed 6 of 8 points this week"

**REFL-3: Written Reflection**
AS A student
I WANT TO write brief notes about my week
SO THAT I can process what worked and what didn't

Acceptance Criteria:
- [ ] Text prompts: "What went well?", "What was challenging?", "Focus for next week?"
- [ ] Text areas with reasonable character limit (500 chars each)
- [ ] Optional — can skip if desired
- [ ] Auto-saves

**REFL-4: Draft Next Week**
AS A student
I WANT TO drag tasks into next week's sprint
SO THAT I have a plan ready for Monday

Acceptance Criteria:
- [ ] Backlog column visible
- [ ] Drag tasks to "This Week" column for next sprint
- [ ] Can create new tasks inline
- [ ] Point total shown: "Next week: 7 points planned"
- [ ] Saved as draft (not committed)

### Epic 4: Goal Commitment (Monday)

**GOAL-1: Review Draft**
AS A student
I WANT TO see the goals I drafted Friday
SO THAT I can commit or adjust with fresh perspective

Acceptance Criteria:
- [ ] Monday view shows "Your plan for this week:"
- [ ] Tasks in "This Week" column displayed
- [ ] Point total and comparison to past weeks shown
- [ ] Edit button available to adjust

**GOAL-2: Commit to Sprint**
AS A student
I WANT TO commit to my weekly goals
SO THAT my burndown chart has a starting point

Acceptance Criteria:
- [ ] "Commit" button locks in the sprint
- [ ] Total points become burndown baseline
- [ ] Timestamp recorded
- [ ] Confirmation: "Let's do this! 7 points to burn 🔥"

**GOAL-3: Velocity Feedback**
AS A student
I WANT TO see how my plan compares to what I usually accomplish
SO THAT I can set realistic goals

Acceptance Criteria:
- [ ] Show average points completed past 4 weeks
- [ ] Compare to current plan
- [ ] Encouraging framing: "Ambitious!" or "You've got this!"
- [ ] Suggestion if wildly over/under

### Epic 5: Kanban Board

**KAN-1: View Board**
AS A student
I WANT TO see my tasks in columns
SO THAT I can visualize my workflow

Acceptance Criteria:
- [ ] Four columns: Backlog, This Week, In Progress, Done
- [ ] Tasks displayed as cards with title and points
- [ ] Color coding by category (personal, attendance, etc.)
- [ ] Current week filter by default

**KAN-2: Drag and Drop**
AS A student
I WANT TO drag tasks between columns
SO THAT I can update status easily

Acceptance Criteria:
- [ ] Touch-friendly drag and drop
- [ ] Visual feedback during drag
- [ ] Status updates on drop
- [ ] If moved to "Done", completedAt timestamp set

**KAN-3: Create Task**
AS A student
I WANT TO create new tasks
SO THAT I can add goals as they come up

Acceptance Criteria:
- [ ] "+" button in each column
- [ ] Quick-add: just title (defaults: 1 point, personal category)
- [ ] Full edit: title, points, category, parent goal
- [ ] Task appears in column where created

**KAN-4: Edit Task**
AS A student
I WANT TO edit task details
SO THAT I can refine my goals

Acceptance Criteria:
- [ ] Tap task to open detail view
- [ ] Edit title, points, category
- [ ] Assign to parent goal (optional)
- [ ] Delete option with confirmation

**KAN-5: Break Down Goals**
AS A student
I WANT TO break a big goal into smaller tasks
SO THAT I can make incremental progress

Acceptance Criteria:
- [ ] "Add Sub-task" option on goal detail
- [ ] Sub-tasks link to parent goal
- [ ] Parent goal shows progress: "2 of 5 tasks done"
- [ ] Parent goal progress visualized (progress bar)

### Epic 6: Burndown Chart

**BURN-1: View Burndown**
AS A student
I WANT TO see my weekly burndown chart
SO THAT I can track my pace

Acceptance Criteria:
- [ ] Chart displays Mon-Fri on X-axis
- [ ] Points remaining on Y-axis
- [ ] Ideal burndown line (diagonal)
- [ ] Actual burndown line (from completions)
- [ ] Today marker

**BURN-2: Auto-Track Attendance**
AS A student
I WANT attendance goals to auto-update
SO THAT I don't have to manually check them off

Acceptance Criteria:
- [ ] If "On time 5/5" goal exists, auto-check daily
- [ ] Burns 1 point per on-time day
- [ ] Reflected in burndown chart automatically
- [ ] Visual indicator that this is auto-tracked

**BURN-3: Auto-Track Hall Pass**
AS A student
I WANT hall pass goals to auto-update
SO THAT usage is accurately reflected

Acceptance Criteria:
- [ ] If "Max 3 hall passes" goal exists, track usage
- [ ] Each pass used burns a point (inverted logic)
- [ ] "Under 5 min average" type goals track duration
- [ ] Clear visual of goal vs actual

**BURN-4: Burndown Interpretation**
AS A student
I WANT to understand what my burndown means
SO THAT I can learn from it

Acceptance Criteria:
- [ ] Contextual messages based on pace
- [ ] "Ahead of schedule 🎯" / "On track 👍" / "Behind — what's blocking you?"
- [ ] Flat lines noted: "No progress Tue-Wed"
- [ ] Weekly summary in Friday reflection

### Epic 7: Admin & Setup

**ADMIN-1: Class Setup**
AS A teacher
I WANT TO create a class and add students
SO THAT the system knows who belongs where

Acceptance Criteria:
- [ ] Create class with name and bell schedule
- [ ] Add students manually (First Name, Last Initial)
- [ ] Import from CSV (MyEd BC export format)
- [ ] Edit/remove students

**ADMIN-2: Bell Schedule**
AS A teacher
I WANT TO configure bell times
SO THAT on-time/late is calculated correctly

Acceptance Criteria:
- [ ] Set class start time
- [ ] Set class end time
- [ ] Set hall pass buffer (first/last X minutes blocked)
- [ ] Different schedules for different days (optional)

**ADMIN-3: Switch Classes**
AS A teacher
I WANT TO switch between class rosters on the tablet
SO THAT different periods can use the same device

Acceptance Criteria:
- [ ] Quick class selector on tablet
- [ ] PIN or simple auth to switch (prevent student switching)
- [ ] Roster updates immediately
- [ ] Previous class data preserved

---

## Technical Requirements

### Platform
- Primary: Progressive Web App (PWA)
- Tablet: Chrome on Android/iPad, kiosk-style (full screen)
- Student devices: Any modern browser

### Performance
- Attendance sign-in: < 1 second response
- Offline support for tablet (sync when connected)
- Drag-and-drop: 60fps smooth

### Accessibility
- Touch targets: minimum 44px
- High contrast mode option
- Screen reader compatible

### Privacy
- No photos in V1 (future consideration)
- Student data not shared between students
- Teacher sees aggregate + individual (their classes only)
- Data export for parent/student on request

---

## Design Principles

1. **Professional, not childish** — These are young professionals, not kids
2. **Encouraging, not punishing** — Celebrate progress, don't shame failures
3. **Minimal friction** — Daily interactions should take seconds
4. **Incremental success** — Small wins build confidence
5. **Self-management** — Students own their data and goals
6. **Real-world skills** — Kanban, burndown, sprints are professional tools

---

## MVP Scope (Phase 1)

**In Scope:**
- [ ] Student roster management (manual add)
- [ ] Attendance sign-in with two-step confirmation
- [ ] Hall pass request/return with timer
- [ ] Basic Kanban board (4 columns, drag-drop)
- [ ] Friday reflection form (professionalism ratings)
- [ ] Monday commit flow
- [ ] Simple burndown chart
- [ ] Teacher attendance view + CSV export

**Out of Scope (Future):**
- [ ] Photo verification
- [ ] MyEd BC direct integration
- [ ] Parent portal
- [ ] Multi-school deployment
- [ ] Gamification beyond streaks (badges, levels)
- [ ] AI-generated goal suggestions

---

## Success Metrics

- **Adoption:** 90%+ students using daily within 2 weeks
- **Engagement:** 80%+ complete Friday reflections
- **On-time improvement:** Measurable increase in punctuality
- **Goal completion:** Students completing 70%+ of weekly goals
- **Teacher time saved:** Attendance taking < 1 min vs. manual

---

## Tech Stack

- **Framework:** React + TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Backend:** Firebase (Firestore + Auth)
  - Start with localStorage for rapid prototyping
  - Structure data for easy Firebase migration
- **Drag-and-drop:** @dnd-kit/core (accessible, touch-friendly)
- **Charts:** Recharts (simple, React-native)
- **PWA:** Vite PWA plugin
