import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY_HALLPASS,
  authDomain: "hall-pass-edu.firebaseapp.com",
  projectId: "hall-pass-edu",
  storageBucket: "hall-pass-edu.firebasestorage.app",
  messagingSenderId: "104819651723",
  appId: "1:104819651723:web:a6de8748e1e88c5b8bd08e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAttendance() {
  // Get all attendance records
  const attendanceRef = collection(db, 'attendance');
  const snapshot = await getDocs(attendanceRef);
  
  console.log(`\n📊 ATTENDANCE RECORDS IN FIREBASE: ${snapshot.size}\n`);
  
  const records = [];
  snapshot.forEach(doc => {
    records.push({ id: doc.id, ...doc.data() });
  });
  
  // Group by date and class
  const grouped = {};
  records.forEach(r => {
    const key = `${r.date || 'unknown'} | ${r.classCode || r.className || 'unknown'}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });
  
  console.log('📅 Records by Date/Class:');
  for (const [key, recs] of Object.entries(grouped)) {
    const present = recs.filter(r => r.status === 'present').length;
    const absent = recs.filter(r => r.status === 'absent').length;
    const late = recs.filter(r => r.status === 'late').length;
    console.log(`  ${key}: ${recs.length} records (✅ ${present} present, ❌ ${absent} absent, ⏰ ${late} late)`);
  }
  
  // Show some sample records
  console.log('\n📝 Sample Records (first 5):');
  records.slice(0, 5).forEach(r => {
    console.log(`  - ${r.studentName || r.name}: ${r.status} (${r.date || 'no date'}) [ID: ${r.id.slice(0,8)}...]`);
  });
  
  process.exit(0);
}

checkAttendance().catch(e => { console.error(e); process.exit(1); });
