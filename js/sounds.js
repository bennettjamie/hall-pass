/**
 * Hall Pass — Sound Effects
 * Mellow, gentle sounds using Web Audio API
 * No external files needed!
 */

const SoundFX = {
    context: null,
    muted: false,
    
    init() {
        // Create audio context on first user interaction
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.context;
    },
    
    setMuted(muted) {
        this.muted = muted;
    },
    
    // Play a gentle chime (for check-in)
    playCheckIn() {
        if (this.muted) return;
        this.init();
        
        const now = this.context.currentTime;
        
        // Gentle bell-like tone
        this.playTone(523.25, now, 0.15, 'sine', 0.3);      // C5
        this.playTone(659.25, now + 0.1, 0.2, 'sine', 0.25); // E5
        this.playTone(783.99, now + 0.2, 0.3, 'sine', 0.2);  // G5
    },
    
    // Play streak celebration (warmer, more notes)
    playStreak(streakCount) {
        if (this.muted) return;
        this.init();
        
        const now = this.context.currentTime;
        
        if (streakCount >= 10) {
            // Big celebration - ascending arpeggio
            this.playTone(523.25, now, 0.15, 'sine', 0.25);       // C5
            this.playTone(659.25, now + 0.1, 0.15, 'sine', 0.25); // E5
            this.playTone(783.99, now + 0.2, 0.15, 'sine', 0.25); // G5
            this.playTone(1046.50, now + 0.3, 0.4, 'sine', 0.3);  // C6
            this.playTone(1318.51, now + 0.4, 0.5, 'sine', 0.2);  // E6
        } else if (streakCount >= 5) {
            // Medium celebration
            this.playTone(587.33, now, 0.15, 'sine', 0.25);       // D5
            this.playTone(739.99, now + 0.12, 0.15, 'sine', 0.25);// F#5
            this.playTone(880.00, now + 0.24, 0.3, 'sine', 0.25); // A5
            this.playTone(1174.66, now + 0.36, 0.4, 'sine', 0.2); // D6
        } else if (streakCount >= 3) {
            // Small streak acknowledgment
            this.playTone(493.88, now, 0.12, 'sine', 0.2);        // B4
            this.playTone(659.25, now + 0.1, 0.15, 'sine', 0.22); // E5
            this.playTone(783.99, now + 0.2, 0.25, 'sine', 0.18); // G5
        } else {
            // Just regular check-in
            this.playCheckIn();
        }
    },
    
    // Play welcome sound (for first check-in ever)
    playWelcome() {
        if (this.muted) return;
        this.init();
        
        const now = this.context.currentTime;
        
        // Warm, welcoming chord progression
        this.playTone(392.00, now, 0.2, 'sine', 0.2);         // G4
        this.playTone(493.88, now, 0.2, 'sine', 0.15);        // B4
        this.playTone(587.33, now, 0.2, 'sine', 0.15);        // D5
        
        this.playTone(440.00, now + 0.25, 0.3, 'sine', 0.2);  // A4
        this.playTone(523.25, now + 0.25, 0.3, 'sine', 0.15); // C5
        this.playTone(659.25, now + 0.25, 0.3, 'sine', 0.15); // E5
        
        this.playTone(523.25, now + 0.55, 0.5, 'sine', 0.25); // C5
        this.playTone(659.25, now + 0.55, 0.5, 'sine', 0.2);  // E5
        this.playTone(783.99, now + 0.55, 0.5, 'sine', 0.15); // G5
    },
    
    // Play return sound (thumbs up - short positive)
    playReturn() {
        if (this.muted) return;
        this.init();
        
        const now = this.context.currentTime;
        
        // Quick happy chirp
        this.playTone(698.46, now, 0.08, 'sine', 0.15);       // F5
        this.playTone(880.00, now + 0.08, 0.15, 'sine', 0.18);// A5
    },
    
    // Helper: play a single tone
    playTone(frequency, startTime, duration, type = 'sine', volume = 0.2) {
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        // Envelope for gentle attack/release
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.1);
    }
};

// Export
window.SoundFX = SoundFX;
