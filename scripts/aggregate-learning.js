#!/usr/bin/env node
/**
 * Hall Pass Learning Aggregator
 * 
 * Reads all submissions from `learning` collection,
 * aggregates OCR patterns, and writes to `corrections` collection.
 * 
 * Run periodically (cron) or manually after batch of new users.
 * 
 * Usage: node aggregate-learning.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyBjn4fNFumGlgNgWNnGElm2I6We_fc9tFw",
    authDomain: "hall-pass-edu.firebaseapp.com",
    projectId: "hall-pass-edu",
    storageBucket: "hall-pass-edu.firebasestorage.app",
    messagingSenderId: "104819651723",
    appId: "1:104819651723:web:a6de8748e1e88c5b8bd08e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function aggregate() {
    console.log('📊 Hall Pass Learning Aggregator\n');
    
    // 1. Fetch all learning submissions
    const learningSnap = await getDocs(collection(db, 'learning'));
    console.log(`Found ${learningSnap.size} learning submissions\n`);
    
    if (learningSnap.empty) {
        console.log('No data to aggregate yet.');
        return;
    }
    
    // 2. Aggregate patterns
    const ocrFixes = {};  // { "wrong": { "right": count } }
    const gridPatterns = [];
    let totalMissed = 0;
    let totalCorrected = 0;
    
    learningSnap.forEach(docSnap => {
        const data = docSnap.data();
        
        // Grid patterns
        if (data.gridPattern && data.gridPattern.samples > 0) {
            gridPatterns.push(data.gridPattern);
        }
        
        // OCR patterns
        if (data.patterns) {
            for (const p of data.patterns) {
                if (p.type === 'missed') {
                    totalMissed++;
                } else if (p.type === 'ocr_fix' && p.wrong && p.right) {
                    if (!ocrFixes[p.wrong]) ocrFixes[p.wrong] = {};
                    ocrFixes[p.wrong][p.right] = (ocrFixes[p.wrong][p.right] || 0) + 1;
                    totalCorrected++;
                }
            }
        }
        
        // Stats
        if (data.stats) {
            // Could aggregate more stats here
        }
    });
    
    console.log(`Total OCR corrections: ${totalCorrected}`);
    console.log(`Total missed by OCR: ${totalMissed}\n`);
    
    // 3. Build correction dictionary (threshold: 2+ occurrences)
    const THRESHOLD = 2;
    const ocrMistakes = {};
    
    for (const [wrong, rights] of Object.entries(ocrFixes)) {
        // Find most common correction
        let bestRight = null;
        let bestCount = 0;
        
        for (const [right, count] of Object.entries(rights)) {
            if (count > bestCount) {
                bestCount = count;
                bestRight = right;
            }
        }
        
        if (bestCount >= THRESHOLD) {
            ocrMistakes[wrong] = bestRight;
            console.log(`✓ "${wrong}" → "${bestRight}" (${bestCount} occurrences)`);
        } else {
            console.log(`  "${wrong}" → "${bestRight}" (${bestCount} - below threshold)`);
        }
    }
    
    // 4. Aggregate grid patterns (average)
    let avgPattern = { avgWidth: 150, avgHeight: 180, colSpacing: 200, rowSpacing: 250 };
    
    if (gridPatterns.length > 0) {
        const sum = (arr, key) => arr.reduce((a, p) => a + (p[key] || 0), 0) / arr.length;
        avgPattern = {
            avgWidth: Math.round(sum(gridPatterns, 'avgWidth')),
            avgHeight: Math.round(sum(gridPatterns, 'avgHeight')),
            colSpacing: Math.round(sum(gridPatterns, 'colSpacing')),
            rowSpacing: Math.round(sum(gridPatterns, 'rowSpacing'))
        };
        console.log(`\nAveraged grid pattern from ${gridPatterns.length} samples:`, avgPattern);
    }
    
    // 5. Write to corrections collection
    const correctionsDoc = {
        updatedAt: new Date().toISOString(),
        ocrMistakes,
        patterns: avgPattern,
        stats: {
            totalSubmissions: learningSnap.size,
            totalCorrected,
            totalMissed,
            dictionarySize: Object.keys(ocrMistakes).length
        }
    };
    
    await setDoc(doc(db, 'corrections', 'aggregated'), correctionsDoc);
    
    console.log('\n✅ Corrections dictionary updated!');
    console.log(`   ${Object.keys(ocrMistakes).length} OCR corrections active`);
    console.log(`   Patterns averaged from ${gridPatterns.length} samples`);
}

aggregate()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
