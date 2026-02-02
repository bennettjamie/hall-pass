/**
 * Hall Pass — Schedule Configuration
 * Britannia Secondary School Bell Schedule 2024-2025
 */

const SCHEDULES = {
    // Monday - No FIT
    monday: {
        name: 'Monday (No FIT)',
        periods: [
            { period: 1, start: '08:40', end: '10:00' },
            { period: 2, start: '10:10', end: '11:30' },
            { period: 3, start: '12:15', end: '13:35' },
            { period: 4, start: '13:45', end: '15:05' }
        ],
        lunch: { start: '11:30', end: '12:15' }
    },
    
    // Tuesday - PM FIT
    tuesday: {
        name: 'Tuesday (PM FIT)',
        periods: [
            { period: 1, start: '08:40', end: '10:00' },
            { period: 2, start: '10:10', end: '11:30' },
            { period: 3, start: '12:15', end: '13:15' },
            { period: 4, start: '13:25', end: '14:25' }
        ],
        fit: { start: '14:25', end: '15:05' },
        lunch: { start: '11:30', end: '12:15' }
    },
    
    // Wednesday - AM FIT
    wednesday: {
        name: 'Wednesday (AM FIT)',
        fit: { start: '08:40', end: '09:20' },
        periods: [
            { period: 1, start: '09:20', end: '10:20' },
            { period: 2, start: '10:30', end: '11:30' },
            { period: 3, start: '12:15', end: '13:35' },
            { period: 4, start: '13:45', end: '15:05' }
        ],
        lunch: { start: '11:30', end: '12:15' }
    },
    
    // Thursday - PM FIT
    thursday: {
        name: 'Thursday (PM FIT)',
        periods: [
            { period: 1, start: '08:40', end: '10:00' },
            { period: 2, start: '10:10', end: '11:30' },
            { period: 3, start: '12:15', end: '13:15' },
            { period: 4, start: '13:25', end: '14:05' }
        ],
        fit: { start: '14:05', end: '15:05' },
        lunch: { start: '11:30', end: '12:15' }
    },
    
    // Friday - AM FIT
    friday: {
        name: 'Friday (AM FIT)',
        fit: { start: '08:40', end: '09:20' },
        periods: [
            { period: 1, start: '09:20', end: '10:20' },
            { period: 2, start: '10:30', end: '11:30' },
            { period: 3, start: '12:15', end: '13:35' },
            { period: 4, start: '13:45', end: '15:05' }
        ],
        lunch: { start: '11:30', end: '12:15' }
    },
    
    // Collaborative Day (AM)
    'collab-am': {
        name: 'Collab Day (AM)',
        collab: { start: '08:40', end: '10:00' },
        periods: [
            { period: 1, start: '10:00', end: '10:40' },
            { period: 2, start: '10:50', end: '11:30' },
            { period: 3, start: '12:15', end: '13:35' },
            { period: 4, start: '13:45', end: '15:05' }
        ],
        lunch: { start: '11:30', end: '12:15' }
    },
    
    // Collaborative Day (PM)
    'collab-pm': {
        name: 'Collab Day (PM)',
        periods: [
            { period: 1, start: '08:40', end: '10:00' },
            { period: 2, start: '10:10', end: '11:30' },
            { period: 3, start: '12:15', end: '12:55' },
            { period: 4, start: '13:05', end: '13:45' }
        ],
        collab: { start: '13:45', end: '15:05' },
        lunch: { start: '11:30', end: '12:15' }
    },
    
    // Early Dismissal
    early: {
        name: 'Early Dismissal',
        periods: [
            { period: 1, start: '08:40', end: '10:00' },
            { period: 2, start: '10:10', end: '11:30' },
            { period: 3, start: '12:15', end: '13:05' },
            { period: 4, start: '13:15', end: '14:05' }
        ],
        lunch: { start: '11:30', end: '12:15' },
        dismissal: '14:05'
    },
    
    // Custom - user configurable
    custom: {
        name: 'Custom',
        periods: [
            { period: 1, start: '08:40', end: '10:00' },
            { period: 2, start: '10:10', end: '11:30' },
            { period: 3, start: '12:15', end: '13:35' },
            { period: 4, start: '13:45', end: '15:05' }
        ],
        lunch: { start: '11:30', end: '12:15' }
    }
};

// Get today's default schedule based on day of week
function getDefaultDayType() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    
    // Weekend defaults to Monday
    if (today === 'sunday' || today === 'saturday') {
        return 'monday';
    }
    
    return today;
}

// Parse time string (HH:MM) to Date object for today
function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
}

// Get period info for a given day type and period number
function getPeriodInfo(dayType, periodNum) {
    const schedule = SCHEDULES[dayType];
    if (!schedule) return null;
    
    const period = schedule.periods.find(p => p.period === periodNum);
    if (!period) return null;
    
    return {
        ...period,
        startDate: parseTime(period.start),
        endDate: parseTime(period.end)
    };
}

// Calculate time until class starts
function getTimeUntilClass(dayType, periodNum) {
    const period = getPeriodInfo(dayType, periodNum);
    if (!period) return null;
    
    const now = new Date();
    const diff = period.startDate - now;
    
    return {
        milliseconds: diff,
        seconds: Math.floor(diff / 1000),
        minutes: Math.floor(diff / 60000),
        isStarted: diff <= 0,
        isEnded: now > period.endDate
    };
}

// Check if current time is within grace period (default 2 minutes)
function isOnTime(dayType, periodNum, checkInTime, graceMinutes = 2) {
    const period = getPeriodInfo(dayType, periodNum);
    if (!period) return { onTime: false, minutesLate: 0 };
    
    const graceEnd = new Date(period.startDate.getTime() + graceMinutes * 60000);
    const checkIn = new Date(checkInTime);
    
    if (checkIn <= graceEnd) {
        return { onTime: true, minutesLate: 0, secondsLate: 0 };
    }
    
    const lateMs = checkIn - period.startDate;
    return {
        onTime: false,
        minutesLate: Math.floor(lateMs / 60000),
        secondsLate: Math.floor((lateMs % 60000) / 1000)
    };
}

// Check if hall passes are in blackout period
function isHallPassBlackout(dayType, periodNum, blackoutStartMin = 10, blackoutEndMin = 10) {
    const period = getPeriodInfo(dayType, periodNum);
    if (!period) return { blackout: true, reason: 'Unknown period' };
    
    const now = new Date();
    const classStart = period.startDate;
    const classEnd = period.endDate;
    
    const blackoutStartEnd = new Date(classStart.getTime() + blackoutStartMin * 60000);
    const blackoutEndStart = new Date(classEnd.getTime() - blackoutEndMin * 60000);
    
    if (now < blackoutStartEnd) {
        const remaining = Math.ceil((blackoutStartEnd - now) / 60000);
        return { blackout: true, reason: `Available in ${remaining} min` };
    }
    
    if (now > blackoutEndStart) {
        return { blackout: true, reason: 'Class ending soon' };
    }
    
    return { blackout: false };
}

// Format time for display (countdown)
function formatCountdown(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Format time for display (clock)
function formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
}

// Export for use in app.js
window.Schedule = {
    SCHEDULES,
    getDefaultDayType,
    parseTime,
    getPeriodInfo,
    getTimeUntilClass,
    isOnTime,
    isHallPassBlackout,
    formatCountdown,
    formatTime
};
