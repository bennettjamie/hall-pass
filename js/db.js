/**
 * Hall Pass — IndexedDB Database Layer
 * All data stored locally on device
 */

const DB_NAME = 'HallPassDB';
const DB_VERSION = 1;

let db = null;

// Initialize database
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Students store
            if (!db.objectStoreNames.contains('students')) {
                const studentStore = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
                studentStore.createIndex('name', ['lastName', 'firstName'], { unique: false });
                studentStore.createIndex('classId', 'classId', { unique: false });
            }
            
            // Attendance records
            if (!db.objectStoreNames.contains('attendance')) {
                const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
                attendanceStore.createIndex('studentDate', ['studentId', 'date'], { unique: true });
                attendanceStore.createIndex('date', 'date', { unique: false });
            }
            
            // Hall pass trips
            if (!db.objectStoreNames.contains('hallpass')) {
                const hallpassStore = db.createObjectStore('hallpass', { keyPath: 'id', autoIncrement: true });
                hallpassStore.createIndex('studentDate', ['studentId', 'date'], { unique: false });
                hallpassStore.createIndex('date', 'date', { unique: false });
            }
            
            // Streaks
            if (!db.objectStoreNames.contains('streaks')) {
                const streakStore = db.createObjectStore('streaks', { keyPath: 'studentId' });
            }
            
            // Layouts
            if (!db.objectStoreNames.contains('layouts')) {
                const layoutStore = db.createObjectStore('layouts', { keyPath: 'id', autoIncrement: true });
                layoutStore.createIndex('name', 'name', { unique: false });
            }
            
            // Settings
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };
    });
}

// Generic CRUD operations
async function getAll(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function get(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function put(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function add(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function remove(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Student operations
async function getStudents() {
    return getAll('students');
}

async function getStudent(id) {
    return get('students', id);
}

async function saveStudent(student) {
    return put('students', student);
}

async function addStudent(student) {
    // Ensure required fields
    const newStudent = {
        ...student,
        firstName: student.firstName || '',
        lastInitial: student.lastInitial || '',
        caricature: student.caricature || null,
        hasPhoto: !!student.caricature,
        isArchived: false,
        firstCheckIn: true,
        createdAt: new Date().toISOString()
    };
    return add('students', newStudent);
}

async function archiveStudent(id) {
    const student = await getStudent(id);
    if (student) {
        student.isArchived = true;
        return saveStudent(student);
    }
}

// Attendance operations
async function getAttendanceForDate(date) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('attendance', 'readonly');
        const store = transaction.objectStore('attendance');
        const index = store.index('date');
        const request = index.getAll(dateStr);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getStudentAttendance(studentId, startDate, endDate) {
    const records = await getAll('attendance');
    return records.filter(r => 
        r.studentId === studentId &&
        r.date >= startDate &&
        r.date <= endDate
    );
}

async function recordAttendance(studentId, period, isLate, minutesLate = 0, secondsLate = 0) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    const record = {
        studentId,
        date: dateStr,
        period,
        checkInTime: now.toISOString(),
        isLate,
        minutesLate,
        secondsLate,
        checkedInBy: 'self'
    };
    
    // Check if already checked in today for this period
    const existing = await getAttendanceForDate(dateStr);
    const existingRecord = existing.find(r => r.studentId === studentId && r.period === period);
    
    if (existingRecord) {
        return existingRecord; // Already checked in
    }
    
    const id = await add('attendance', record);
    
    // Update streak
    await updateStreak(studentId, !isLate);
    
    return { ...record, id };
}

// Streak operations
async function getStreak(studentId) {
    const streak = await get('streaks', studentId);
    return streak || {
        studentId,
        currentStreak: 0,
        longestStreak: 0,
        streakInDanger: false,
        lastOnTimeDate: null
    };
}

async function updateStreak(studentId, wasOnTime) {
    const streak = await getStreak(studentId);
    const today = new Date().toISOString().split('T')[0];
    
    if (wasOnTime) {
        streak.currentStreak++;
        streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
        streak.lastOnTimeDate = today;
        streak.streakInDanger = false;
    } else {
        // Streak protection for 10+
        if (streak.currentStreak >= 10 && !streak.streakInDanger) {
            streak.streakInDanger = true;
        } else {
            streak.currentStreak = 0;
            streak.streakInDanger = false;
        }
    }
    
    return put('streaks', streak);
}

// Hall Pass operations
async function getHallPassesForDate(date) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('hallpass', 'readonly');
        const store = transaction.objectStore('hallpass');
        const index = store.index('date');
        const request = index.getAll(dateStr);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function createHallPassTrip(studentId, reason, committedMinutes) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const committedReturn = new Date(now.getTime() + committedMinutes * 60000);
    
    const trip = {
        studentId,
        date: dateStr,
        reason,
        checkOutTime: now.toISOString(),
        committedReturnTime: committedReturn.toISOString(),
        actualReturnTime: null,
        status: 'out'
    };
    
    const id = await add('hallpass', trip);
    return { ...trip, id };
}

async function completeHallPassTrip(tripId) {
    const trip = await get('hallpass', tripId);
    if (!trip) return null;
    
    const now = new Date();
    const committed = new Date(trip.committedReturnTime);
    const checkOut = new Date(trip.checkOutTime);
    
    trip.actualReturnTime = now.toISOString();
    trip.status = 'returned';
    trip.durationMinutes = Math.round((now - checkOut) / 60000);
    trip.overUnderMinutes = Math.round((now - committed) / 60000);
    
    await put('hallpass', trip);
    return trip;
}

async function getActiveHallPass() {
    const today = new Date().toISOString().split('T')[0];
    const passes = await getHallPassesForDate(today);
    return passes.find(p => p.status === 'out');
}

async function getHallPassQueue() {
    const today = new Date().toISOString().split('T')[0];
    const passes = await getHallPassesForDate(today);
    return passes.filter(p => p.status === 'queued').sort((a, b) => 
        new Date(a.checkOutTime) - new Date(b.checkOutTime)
    );
}

async function getStudentHallPassCooldown(studentId) {
    const today = new Date().toISOString().split('T')[0];
    const passes = await getHallPassesForDate(today);
    const studentPasses = passes.filter(p => 
        p.studentId === studentId && 
        p.status === 'returned'
    );
    
    if (studentPasses.length === 0) return { onCooldown: false };
    
    const lastReturn = studentPasses
        .map(p => new Date(p.actualReturnTime))
        .sort((a, b) => b - a)[0];
    
    const cooldownEnd = new Date(lastReturn.getTime() + 20 * 60000);
    const now = new Date();
    
    if (now < cooldownEnd) {
        return {
            onCooldown: true,
            remainingMinutes: Math.ceil((cooldownEnd - now) / 60000)
        };
    }
    
    return { onCooldown: false };
}

// Layout operations
async function getLayouts() {
    return getAll('layouts');
}

async function getActiveLayout() {
    const layouts = await getLayouts();
    return layouts.find(l => l.isActive) || layouts[0];
}

async function saveLayout(layout) {
    return put('layouts', layout);
}

async function setActiveLayout(layoutId) {
    const layouts = await getLayouts();
    for (const layout of layouts) {
        layout.isActive = layout.id === layoutId;
        await saveLayout(layout);
    }
}

async function createDefaultLayout(gridSize = { rows: 6, cols: 6 }) {
    const layout = {
        name: 'Default Seating',
        gridSize,
        positions: [],
        isActive: true,
        createdAt: new Date().toISOString()
    };
    return add('layouts', layout);
}

// Settings operations
async function getSetting(key, defaultValue = null) {
    const setting = await get('settings', key);
    return setting ? setting.value : defaultValue;
}

async function setSetting(key, value) {
    return put('settings', { key, value });
}

// Import/Export
async function exportAllData() {
    const data = {
        version: DB_VERSION,
        exportedAt: new Date().toISOString(),
        students: await getAll('students'),
        attendance: await getAll('attendance'),
        hallpass: await getAll('hallpass'),
        streaks: await getAll('streaks'),
        layouts: await getAll('layouts'),
        settings: await getAll('settings')
    };
    return data;
}

async function importAllData(data) {
    // Clear existing data
    const storeNames = ['students', 'attendance', 'hallpass', 'streaks', 'layouts', 'settings'];
    
    for (const storeName of storeNames) {
        const items = await getAll(storeName);
        for (const item of items) {
            const key = storeName === 'settings' ? item.key : 
                        storeName === 'streaks' ? item.studentId : item.id;
            await remove(storeName, key);
        }
    }
    
    // Import new data
    for (const student of (data.students || [])) {
        await put('students', student);
    }
    for (const record of (data.attendance || [])) {
        await put('attendance', record);
    }
    for (const trip of (data.hallpass || [])) {
        await put('hallpass', trip);
    }
    for (const streak of (data.streaks || [])) {
        await put('streaks', streak);
    }
    for (const layout of (data.layouts || [])) {
        await put('layouts', layout);
    }
    for (const setting of (data.settings || [])) {
        await put('settings', setting);
    }
}

// Import CSV roster
async function importRosterCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const students = [];
    
    // Skip header if present
    const startIndex = lines[0].toLowerCase().includes('name') || 
                       lines[0].toLowerCase().includes('first') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
        
        let firstName, lastName;
        
        if (parts.length >= 2) {
            // Assume "First Name, Last Name" or "Last Name, First Name"
            // If first part has space, it might be full name
            if (parts[0].includes(' ')) {
                const [first, ...rest] = parts[0].split(' ');
                firstName = first;
                lastName = rest.join(' ');
            } else {
                firstName = parts[0];
                lastName = parts[1];
            }
        } else {
            // Single column - assume "First Last"
            const nameParts = parts[0].split(' ');
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
        }
        
        // Convert to first name + last initial
        const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
        
        const student = {
            firstName: firstName,
            lastInitial: lastInitial,
            caricature: null,
            hasPhoto: false,
            isArchived: false,
            firstCheckIn: true,
            createdAt: new Date().toISOString()
        };
        
        const id = await add('students', student);
        students.push({ ...student, id });
    }
    
    return students;
}

// Clear all students
async function clearStudents() {
    const students = await getAll('students');
    for (const student of students) {
        await remove('students', student.id);
    }
}

// Get attendance history for a student
async function getStudentAttendanceHistory(studentId, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    return getStudentAttendance(studentId, startStr, endStr);
}

// Get class attendance stats
async function getAttendanceStats(days = 30) {
    const records = await getAll('attendance');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const startStr = startDate.toISOString().split('T')[0];
    
    const recentRecords = records.filter(r => r.date >= startStr);
    
    const totalCheckins = recentRecords.length;
    const onTimeCheckins = recentRecords.filter(r => !r.isLate).length;
    const lateCheckins = recentRecords.filter(r => r.isLate).length;
    
    return {
        totalCheckins,
        onTimeCheckins,
        lateCheckins,
        onTimeRate: totalCheckins > 0 ? Math.round((onTimeCheckins / totalCheckins) * 100) : 0
    };
}

// Export attendance to CSV
async function exportAttendanceCSV(days = 30) {
    const students = await getStudents();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    let csv = 'Student Name,Date,Status,Check-in Time,Minutes Late\n';
    
    for (const student of students) {
        const records = await getStudentAttendance(student.id, startStr, endStr);
        const sortKey = `${student.lastInitial}, ${student.firstName}`;
        
        for (const record of records) {
            const status = record.isLate ? 'Late' : 'On Time';
            const checkInTime = new Date(record.checkInTime).toLocaleTimeString();
            const minutesLate = record.isLate ? record.minutesLate : 0;
            
            csv += `"${sortKey}","${record.date}","${status}","${checkInTime}",${minutesLate}\n`;
        }
    }
    
    return csv;
}

// Export for use in app.js
window.DB = {
    init: initDB,
    // Students
    getStudents,
    getStudent,
    saveStudent,
    addStudent,
    archiveStudent,
    clearStudents,
    importRosterCSV,
    // Attendance
    getAttendanceForDate,
    getStudentAttendance,
    getStudentAttendanceHistory,
    getAttendanceStats,
    exportAttendanceCSV,
    recordAttendance,
    // Streaks
    getStreak,
    updateStreak,
    // Hall Pass
    getHallPassesForDate,
    createHallPassTrip,
    completeHallPassTrip,
    getActiveHallPass,
    getHallPassQueue,
    getStudentHallPassCooldown,
    // Layouts
    getLayouts,
    getActiveLayout,
    saveLayout,
    setActiveLayout,
    createDefaultLayout,
    // Settings
    getSetting,
    setSetting,
    // Import/Export
    exportAllData,
    importAllData
};
