import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

async function listData() {
  // Check common collection names
  const collections = ['attendance', 'classes', 'students', 'sessions', 'users', 'scans', 'records', 'classrooms'];
  
  for (const name of collections) {
    try {
      const ref = collection(db, name);
      const snapshot = await getDocs(ref);
      if (snapshot.size > 0) {
        console.log(`\n✅ ${name}: ${snapshot.size} documents`);
        snapshot.docs.slice(0, 3).forEach(d => {
          const data = d.data();
          console.log(`   - ${d.id}: ${JSON.stringify(data).slice(0, 150)}...`);
        });
      }
    } catch (e) {
      // Collection doesn't exist or no access
    }
  }
  
  process.exit(0);
}

listData().catch(e => { console.error(e); process.exit(1); });
