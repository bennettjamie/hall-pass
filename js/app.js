/**
 * Hall Pass — Main Application
 */

// App state
const state = {
    dayType: 'monday',
    currentPeriod: 1,
    students: [],
    activeLayout: null,
    todayAttendance: [],
    isMuted: false,
    isPreBell: true,
    isDisplayMode: false,
    hallPassLocked: false,
    blackoutStart: 10,
    blackoutEnd: 10,
    dailyMessage: ''
};

// DOM Elements
const elements = {};

// Initialize the app
async function init() {
    // Cache DOM elements
    cacheElements();
    
    // Initialize database
    await DB.init();
    
    // Load settings
    await loadSettings();
    
    // Load students and layout
    state.students = await DB.getStudents();
    state.activeLayout = await DB.getActiveLayout();
    
    // If no layout exists, create default
    if (!state.activeLayout) {
        await DB.createDefaultLayout();
        state.activeLayout = await DB.getActiveLayout();
    }
    
    // Load today's attendance
    const today = new Date().toISOString().split('T')[0];
    state.todayAttendance = await DB.getAttendanceForDate(today);
    
    // Set default day type based on current day
    state.dayType = Schedule.getDefaultDayType();
    elements.dayType.value = state.dayType;
    
    // Render the grid
    renderGrid();
    
    // Update attendance list
    renderAttendanceList();
    
    // Start countdown timer
    startCountdownTimer();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update stats
    updateStats();
    
    console.log('Hall Pass initialized!');
}

function cacheElements() {
    elements.checkinGrid = document.getElementById('checkinGrid');
    elements.countdownTime = document.getElementById('countdownTime');
    elements.countdown = document.querySelector('.countdown');
    elements.headCount = document.getElementById('headCount');
    elements.onTimeRate = document.getElementById('onTimeRate');
    elements.muteBtn = document.getElementById('muteBtn');
    elements.dayType = document.getElementById('dayType');
    elements.currentPeriod = document.getElementById('currentPeriod');
    elements.dailyMessageText = document.getElementById('dailyMessageText');
    elements.dailyMessageInput = document.getElementById('dailyMessageInput');
    elements.hallpassSpotlight = document.getElementById('hallpassSpotlight');
    elements.queueList = document.getElementById('queueList');
    elements.requestPassBtn = document.getElementById('requestPassBtn');
    elements.attendanceList = document.getElementById('attendanceList');
    elements.displayModeBtn = document.getElementById('displayModeBtn');
    elements.hallpassLocked = document.getElementById('hallpassLocked');
    elements.blackoutStart = document.getElementById('blackoutStart');
    elements.blackoutEnd = document.getElementById('blackoutEnd');
}

async function loadSettings() {
    state.isMuted = await DB.getSetting('muted', false);
    state.hallPassLocked = await DB.getSetting('hallPassLocked', false);
    state.blackoutStart = await DB.getSetting('blackoutStart', 10);
    state.blackoutEnd = await DB.getSetting('blackoutEnd', 10);
    state.dailyMessage = await DB.getSetting('dailyMessage', '');
    state.currentPeriod = await DB.getSetting('currentPeriod', 1);
    
    // Update UI
    if (state.isMuted) {
        elements.muteBtn.textContent = '🔇';
        elements.muteBtn.classList.add('muted');
    }
    
    if (elements.hallpassLocked) {
        elements.hallpassLocked.checked = state.hallPassLocked;
    }
    if (elements.blackoutStart) {
        elements.blackoutStart.value = state.blackoutStart;
    }
    if (elements.blackoutEnd) {
        elements.blackoutEnd.value = state.blackoutEnd;
    }
    if (state.dailyMessage) {
        elements.dailyMessageText.textContent = state.dailyMessage;
        if (elements.dailyMessageInput) {
            elements.dailyMessageInput.value = state.dailyMessage;
        }
    }
    if (elements.currentPeriod) {
        elements.currentPeriod.value = state.currentPeriod;
    }
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Mute button
    elements.muteBtn.addEventListener('click', toggleMute);
    
    // Day type change
    elements.dayType.addEventListener('change', (e) => {
        state.dayType = e.target.value;
        DB.setSetting('dayType', state.dayType);
    });
    
    // Period change
    elements.currentPeriod.addEventListener('change', (e) => {
        state.currentPeriod = parseInt(e.target.value);
        DB.setSetting('currentPeriod', state.currentPeriod);
    });
    
    // Daily message
    document.getElementById('saveDailyMessage')?.addEventListener('click', saveDailyMessage);
    
    // Hall pass settings
    elements.hallpassLocked?.addEventListener('change', (e) => {
        state.hallPassLocked = e.target.checked;
        DB.setSetting('hallPassLocked', state.hallPassLocked);
        updateHallPassUI();
    });
    
    elements.blackoutStart?.addEventListener('change', (e) => {
        state.blackoutStart = parseInt(e.target.value);
        DB.setSetting('blackoutStart', state.blackoutStart);
    });
    
    elements.blackoutEnd?.addEventListener('change', (e) => {
        state.blackoutEnd = parseInt(e.target.value);
        DB.setSetting('blackoutEnd', state.blackoutEnd);
    });
    
    // Request hall pass
    elements.requestPassBtn?.addEventListener('click', showHallPassModal);
    
    // Display mode
    elements.displayModeBtn?.addEventListener('click', toggleDisplayMode);
    
    // Keyboard shortcut for display mode (D key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'd' && e.ctrlKey) {
            e.preventDefault();
            toggleDisplayMode();
        }
    });
    
    // Import roster
    document.getElementById('importRosterBtn')?.addEventListener('click', () => {
        document.getElementById('rosterFileInput').click();
    });
    
    document.getElementById('rosterFileInput')?.addEventListener('change', handleRosterImport);
    
    // Export/Import data
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    document.getElementById('importDataBtn')?.addEventListener('click', () => {
        document.getElementById('dataFileInput').click();
    });
    document.getElementById('dataFileInput')?.addEventListener('change', handleDataImport);
    
    // Hall pass modal
    document.querySelectorAll('.reason-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.reason-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    document.getElementById('confirmPassBtn')?.addEventListener('click', confirmHallPass);
    document.getElementById('cancelPassBtn')?.addEventListener('click', hideHallPassModal);
    
    // Randomize layout
    document.getElementById('randomizeBtn')?.addEventListener('click', showRandomizeOptions);
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
    
    // Refresh content if needed
    if (tabName === 'attendance') {
        renderAttendanceList();
    } else if (tabName === 'hallpass') {
        updateHallPassUI();
    }
}

function renderGrid() {
    const grid = elements.checkinGrid;
    grid.innerHTML = '';
    
    const { rows, cols } = state.activeLayout?.gridSize || { rows: 6, cols: 6 };
    const positions = state.activeLayout?.positions || [];
    
    // Create position map
    const positionMap = {};
    positions.forEach(p => {
        positionMap[`${p.row}-${p.col}`] = p.studentId;
    });
    
    // Also create a map of students who are checked in
    const checkedInMap = {};
    state.todayAttendance.forEach(a => {
        if (a.period === state.currentPeriod) {
            checkedInMap[a.studentId] = a;
        }
    });
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const studentId = positionMap[`${row}-${col}`];
            const student = studentId ? state.students.find(s => s.id === studentId) : null;
            
            if (student && !student.isArchived) {
                cell.dataset.studentId = student.id;
                
                // Caricature
                const caricature = document.createElement('div');
                caricature.className = 'student-caricature';
                
                if (student.caricature) {
                    const img = document.createElement('img');
                    img.src = student.caricature;
                    img.alt = student.firstName;
                    caricature.appendChild(img);
                } else {
                    caricature.classList.add('placeholder');
                    caricature.textContent = '👤';
                }
                
                // Name
                const name = document.createElement('div');
                name.className = 'student-name';
                name.textContent = `${student.firstName} ${student.lastInitial}.`;
                
                cell.appendChild(caricature);
                cell.appendChild(name);
                
                // Check if checked in
                const attendance = checkedInMap[student.id];
                if (attendance) {
                    cell.classList.add('checked-in');
                    if (attendance.isLate) {
                        cell.classList.add('late');
                    }
                }
                
                // Click handler
                cell.addEventListener('click', () => handleCheckIn(student));
                
                // Long press for stats
                let pressTimer;
                cell.addEventListener('mousedown', () => {
                    pressTimer = setTimeout(() => showStudentStats(student), 500);
                });
                cell.addEventListener('mouseup', () => clearTimeout(pressTimer));
                cell.addEventListener('mouseleave', () => clearTimeout(pressTimer));
            } else {
                cell.classList.add('empty');
            }
            
            grid.appendChild(cell);
        }
    }
}

async function handleCheckIn(student) {
    // Check if already checked in
    const existing = state.todayAttendance.find(
        a => a.studentId === student.id && a.period === state.currentPeriod
    );
    
    if (existing) {
        // Already checked in - show stats instead
        showStudentStats(student);
        return;
    }
    
    // Determine if late
    const timeStatus = Schedule.isOnTime(
        state.dayType, 
        state.currentPeriod, 
        new Date()
    );
    
    // Record attendance
    const record = await DB.recordAttendance(
        student.id,
        state.currentPeriod,
        !timeStatus.onTime,
        timeStatus.minutesLate,
        timeStatus.secondsLate
    );
    
    // Update local state
    state.todayAttendance.push(record);
    
    // Get streak info
    const streak = await DB.getStreak(student.id);
    
    // Mark student's first check-in complete
    if (student.firstCheckIn) {
        student.firstCheckIn = false;
        await DB.saveStudent(student);
    }
    
    // Show feedback
    showCheckInFeedback(student, timeStatus, streak);
    
    // Update grid
    renderGrid();
    
    // Update stats
    updateStats();
}

function showCheckInFeedback(student, timeStatus, streak) {
    const modal = document.getElementById('checkinFeedbackModal');
    const caricature = document.getElementById('feedbackCaricature');
    const message = document.getElementById('feedbackMessage');
    const streakEl = document.getElementById('feedbackStreak');
    
    // Set caricature
    if (student.caricature) {
        caricature.innerHTML = `<img src="${student.caricature}" alt="${student.firstName}">`;
    } else {
        caricature.innerHTML = '<div class="placeholder">👤</div>';
    }
    
    // Set message
    if (!timeStatus.onTime) {
        message.textContent = `Late by ${timeStatus.minutesLate}m ${timeStatus.secondsLate}s`;
        message.className = 'feedback-message feedback-late';
        streakEl.textContent = 'Fresh start tomorrow! 💪';
        
        // Play no sound (in-class mode)
    } else {
        // Check for first-ever check-in
        if (student.firstCheckIn) {
            message.textContent = 'Welcome! 🎉';
        } else {
            message.textContent = "You're on time! ✓";
        }
        message.className = 'feedback-message';
        
        // Streak message
        if (streak.currentStreak >= 20) {
            streakEl.textContent = `🔥 ${streak.currentStreak}-day streak! Legend!`;
        } else if (streak.currentStreak >= 10) {
            streakEl.textContent = `🔥 ${streak.currentStreak}-day streak! Amazing!`;
        } else if (streak.currentStreak >= 5) {
            streakEl.textContent = `⭐ ${streak.currentStreak}-day streak! Keep it up!`;
        } else if (streak.currentStreak >= 3) {
            streakEl.textContent = `🔥 ${streak.currentStreak}-day streak! Go for ${streak.currentStreak + 1}!`;
        } else if (streak.currentStreak > 0) {
            streakEl.textContent = `${streak.currentStreak}-day streak`;
        } else {
            streakEl.textContent = '';
        }
        
        // Play sound if pre-bell and not muted
        if (state.isPreBell && !state.isMuted) {
            playCheckInSound(streak.currentStreak);
        }
    }
    
    // Show modal
    modal.classList.add('active');
    
    // Auto-hide after 3 seconds (or less for late arrivals)
    const duration = timeStatus.onTime ? 3000 : 2000;
    setTimeout(() => {
        modal.classList.remove('active');
    }, duration);
}

function playCheckInSound(streakCount) {
    // Simple audio feedback - can be enhanced later
    const audio = document.getElementById('checkinSound');
    
    // Choose sound based on streak milestone
    if (streakCount >= 10) {
        audio.src = 'sounds/celebration.mp3';
    } else if (streakCount >= 3) {
        audio.src = 'sounds/streak.mp3';
    } else {
        audio.src = 'sounds/checkin.mp3';
    }
    
    audio.play().catch(() => {
        // Ignore audio play errors (e.g., no user interaction yet)
    });
}

async function showStudentStats(student) {
    const modal = document.getElementById('studentStatsModal');
    const content = document.getElementById('studentStatsContent');
    
    // Get streak
    const streak = await DB.getStreak(student.id);
    
    // Get attendance history (last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const attendance = await DB.getStudentAttendance(student.id, startDate, endDate);
    
    // Calculate stats
    const totalDays = attendance.length;
    const lateDays = attendance.filter(a => a.isLate).length;
    const onTimeDays = totalDays - lateDays;
    const totalMinutesLate = attendance.reduce((sum, a) => sum + (a.minutesLate || 0), 0);
    const onTimeRate = totalDays > 0 ? Math.round((onTimeDays / totalDays) * 100) : 0;
    
    content.innerHTML = `
        <div class="stats-header">
            <div class="stats-caricature">
                ${student.caricature 
                    ? `<img src="${student.caricature}" alt="${student.firstName}">`
                    : '<div class="placeholder">👤</div>'
                }
            </div>
            <h2>${student.firstName} ${student.lastInitial}.</h2>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${streak.currentStreak}</div>
                <div class="stat-label">Current Streak</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${streak.longestStreak}</div>
                <div class="stat-label">Longest Streak</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${onTimeDays}</div>
                <div class="stat-label">Days On Time</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${lateDays}</div>
                <div class="stat-label">Days Late</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalMinutesLate}m</div>
                <div class="stat-label">Total Minutes Late</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${onTimeRate}%</div>
                <div class="stat-label">On-Time Rate</div>
            </div>
        </div>
        ${streak.streakInDanger ? '<p class="streak-warning">⚠️ Streak in danger! One more late resets it.</p>' : ''}
    `;
    
    modal.classList.add('active');
    
    // Close on click outside or X button
    document.getElementById('closeStatsModal').onclick = () => {
        modal.classList.remove('active');
    };
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('active');
    };
}

function renderAttendanceList() {
    const list = elements.attendanceList;
    if (!list) return;
    
    // Sort students by last initial, then first name
    const sortedStudents = [...state.students]
        .filter(s => !s.isArchived)
        .sort((a, b) => {
            const lastCompare = a.lastInitial.localeCompare(b.lastInitial);
            if (lastCompare !== 0) return lastCompare;
            return a.firstName.localeCompare(b.firstName);
        });
    
    // Create attendance map for current period
    const attendanceMap = {};
    state.todayAttendance.forEach(a => {
        if (a.period === state.currentPeriod) {
            attendanceMap[a.studentId] = a;
        }
    });
    
    list.innerHTML = sortedStudents.map(student => {
        const attendance = attendanceMap[student.id];
        let status, statusClass, timeText;
        
        if (attendance) {
            if (attendance.isLate) {
                status = `Late (${attendance.minutesLate}m)`;
                statusClass = 'late';
            } else {
                status = 'Present';
                statusClass = 'present';
            }
            timeText = new Date(attendance.checkInTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });
        } else {
            status = 'Absent';
            statusClass = 'absent';
            timeText = '—';
        }
        
        return `
            <div class="attendance-row" data-student-id="${student.id}">
                <div class="student-caricature">
                    ${student.caricature 
                        ? `<img src="${student.caricature}" alt="${student.firstName}">`
                        : '<span class="placeholder">👤</span>'
                    }
                </div>
                <div class="attendance-name">${student.lastInitial}., ${student.firstName}</div>
                <div class="attendance-status ${statusClass}">${status}</div>
                <div class="attendance-time">${timeText}</div>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const activeStudents = state.students.filter(s => !s.isArchived);
    const checkedIn = state.todayAttendance.filter(
        a => a.period === state.currentPeriod
    ).length;
    
    elements.headCount.textContent = `${checkedIn}/${activeStudents.length} checked in`;
    
    // Calculate weekly on-time rate (simplified)
    // For now, just show today's rate
    const onTime = state.todayAttendance.filter(
        a => a.period === state.currentPeriod && !a.isLate
    ).length;
    const rate = checkedIn > 0 ? Math.round((onTime / checkedIn) * 100) : 100;
    elements.onTimeRate.textContent = `${rate}% on time today`;
}

function startCountdownTimer() {
    function update() {
        const timeInfo = Schedule.getTimeUntilClass(state.dayType, state.currentPeriod);
        
        if (!timeInfo) {
            elements.countdownTime.textContent = '--:--';
            return;
        }
        
        if (timeInfo.isStarted) {
            // Class has started
            state.isPreBell = false;
            elements.countdown.classList.add('in-class');
            document.querySelector('.countdown-label').textContent = 'Class in session';
            
            // Show elapsed time
            const elapsed = Math.abs(timeInfo.milliseconds);
            elements.countdownTime.textContent = Schedule.formatCountdown(elapsed);
        } else {
            // Pre-bell
            state.isPreBell = true;
            elements.countdown.classList.remove('in-class');
            document.querySelector('.countdown-label').textContent = 'Class starts in';
            elements.countdownTime.textContent = Schedule.formatCountdown(timeInfo.milliseconds);
        }
    }
    
    update();
    setInterval(update, 1000);
}

function toggleMute() {
    state.isMuted = !state.isMuted;
    elements.muteBtn.textContent = state.isMuted ? '🔇' : '🔊';
    elements.muteBtn.classList.toggle('muted', state.isMuted);
    DB.setSetting('muted', state.isMuted);
}

function saveDailyMessage() {
    const message = elements.dailyMessageInput.value.trim();
    state.dailyMessage = message;
    elements.dailyMessageText.textContent = message || 'No message today';
    DB.setSetting('dailyMessage', message);
}

function toggleDisplayMode() {
    state.isDisplayMode = !state.isDisplayMode;
    document.body.classList.toggle('display-mode', state.isDisplayMode);
    
    if (state.isDisplayMode) {
        // Enter fullscreen
        document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
        // Exit fullscreen
        document.exitFullscreen?.().catch(() => {});
    }
}

// Hall Pass Functions
function showHallPassModal() {
    document.getElementById('hallpassRequestModal').classList.add('active');
}

function hideHallPassModal() {
    document.getElementById('hallpassRequestModal').classList.remove('active');
}

async function confirmHallPass() {
    const reason = document.querySelector('.reason-btn.active')?.dataset.reason || 'other';
    const minutes = parseInt(document.querySelector('.time-btn.active')?.dataset.minutes || 5);
    
    // For now, we need a way to identify which student is requesting
    // In a real implementation, this would be tied to the selected student
    // For MVP, we'll show an alert
    alert('Hall pass feature requires student selection. Coming soon!');
    hideHallPassModal();
}

function updateHallPassUI() {
    // Update hall pass UI based on current state
    const blackout = Schedule.isHallPassBlackout(
        state.dayType, 
        state.currentPeriod,
        state.blackoutStart,
        state.blackoutEnd
    );
    
    if (state.hallPassLocked) {
        elements.requestPassBtn.disabled = true;
        elements.requestPassBtn.textContent = '🔒 Hall passes locked';
    } else if (blackout.blackout) {
        elements.requestPassBtn.disabled = true;
        elements.requestPassBtn.textContent = `🚫 ${blackout.reason}`;
    } else {
        elements.requestPassBtn.disabled = false;
        elements.requestPassBtn.textContent = '🙋 Request Pass';
    }
}

// Import/Export Functions
async function handleRosterImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const text = await file.text();
    const newStudents = await DB.importRosterCSV(text);
    
    // Refresh students
    state.students = await DB.getStudents();
    
    // Add new students to layout
    if (state.activeLayout) {
        const { rows, cols } = state.activeLayout.gridSize;
        let nextRow = 0, nextCol = 0;
        
        // Find existing positions
        const usedPositions = new Set(
            state.activeLayout.positions.map(p => `${p.row}-${p.col}`)
        );
        
        for (const student of newStudents) {
            // Find next empty position
            while (usedPositions.has(`${nextRow}-${nextCol}`)) {
                nextCol++;
                if (nextCol >= cols) {
                    nextCol = 0;
                    nextRow++;
                }
                if (nextRow >= rows) break;
            }
            
            if (nextRow < rows) {
                state.activeLayout.positions.push({
                    studentId: student.id,
                    row: nextRow,
                    col: nextCol
                });
                usedPositions.add(`${nextRow}-${nextCol}`);
            }
        }
        
        await DB.saveLayout(state.activeLayout);
    }
    
    renderGrid();
    alert(`Imported ${newStudents.length} students!`);
    
    // Clear file input
    event.target.value = '';
}

async function exportData() {
    const data = await DB.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `hallpass-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

async function handleDataImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('This will replace all existing data. Are you sure?')) {
        event.target.value = '';
        return;
    }
    
    const text = await file.text();
    const data = JSON.parse(text);
    
    await DB.importAllData(data);
    
    // Refresh state
    state.students = await DB.getStudents();
    state.activeLayout = await DB.getActiveLayout();
    state.todayAttendance = await DB.getAttendanceForDate(new Date());
    
    renderGrid();
    renderAttendanceList();
    updateStats();
    await loadSettings();
    
    alert('Data imported successfully!');
    event.target.value = '';
}

function showRandomizeOptions() {
    const options = ['Full shuffle', 'Random pairs', 'Groups of 3', 'Groups of 4'];
    const choice = prompt(
        'Randomize layout:\n' +
        '1. Full shuffle\n' +
        '2. Random pairs\n' +
        '3. Groups of 3\n' +
        '4. Groups of 4\n\n' +
        'Enter number (1-4):'
    );
    
    if (!choice) return;
    
    const groupSize = choice === '1' ? 1 : choice === '2' ? 2 : choice === '3' ? 3 : 4;
    randomizeLayout(groupSize);
}

async function randomizeLayout(groupSize = 1) {
    const activeStudents = state.students.filter(s => !s.isArchived);
    const shuffled = [...activeStudents].sort(() => Math.random() - 0.5);
    
    const { rows, cols } = state.activeLayout.gridSize;
    const positions = [];
    
    let idx = 0;
    for (let row = 0; row < rows && idx < shuffled.length; row++) {
        for (let col = 0; col < cols && idx < shuffled.length; col++) {
            positions.push({
                studentId: shuffled[idx].id,
                row,
                col,
                group: Math.floor(idx / groupSize)
            });
            idx++;
        }
    }
    
    state.activeLayout.positions = positions;
    await DB.saveLayout(state.activeLayout);
    
    renderGrid();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
