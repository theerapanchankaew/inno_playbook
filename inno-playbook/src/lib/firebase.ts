import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { Auth, getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-7347674143-f5d12',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase ต้อง initialize เฉพาะ client-side เท่านั้น
// ป้องกัน error ระหว่าง Next.js SSR / build
let db: Firestore;
let auth: Auth;

if (typeof window !== 'undefined') {
  const app: FirebaseApp =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
} else {
  // SSR stub — ไม่ถูกเรียกใช้จริงเพราะ code ทั้งหมดอยู่ใน 'use client'
  db = {} as Firestore;
  auth = {} as Auth;
}

export { db, auth };
