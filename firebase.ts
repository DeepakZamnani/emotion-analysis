
/**
 * Firebase Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (or use an existing one)
 * 3. Click "Add app" → Web
 * 4. Copy your firebaseConfig values below
 * 5. In Firestore Database → Rules, set read/write to true for development:
 *    rules_version = '2';
 *    service cloud.firestore {
 *      match /databases/{database}/documents {
 *        match /{document=**} { allow read, write: if true; }
 *      }
 *    }
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { SessionRecord, UserProfile, MoodEntry } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyC9gRR1V45hmt7EGKfmBFkhrP2NpshuRes",
  authDomain: "emotion-analysis-809b7.firebaseapp.com",
  projectId: "emotion-analysis-809b7",
  storageBucket: "emotion-analysis-809b7.firebasestorage.app",
  messagingSenderId: "876952403546",
  appId: "1:876952403546:web:e88bc4e5ab2b1cb0f12263",
  measurementId: "G-VC0R1D5RSE"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

// ─── Session helpers ──────────────────────────────────────────────────────────

export async function saveSession(record: Omit<SessionRecord, 'id'>): Promise<string | null> {
  try {
    const sessionsRef = collection(db, 'users', record.userId, 'sessions');
    const docRef = await addDoc(sessionsRef, {
      ...record,
      startTime: Timestamp.fromDate(record.startTime),
      endTime: Timestamp.fromDate(record.endTime),
      emotionHistory: record.emotionHistory.map(e => ({
        ...e,
        timestamp: Timestamp.fromDate(e.timestamp)
      }))
    });
    return docRef.id;
  } catch (err) {
    console.error('Firebase saveSession error:', err);
    return null;
  }
}

export async function getSessions(userId: string, limitCount = 30): Promise<SessionRecord[]> {
  try {
    const sessionsRef = collection(db, 'users', userId, 'sessions');
    const q = query(sessionsRef, orderBy('startTime', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(d => {
      const data = d.data() as DocumentData;
      return {
        id: d.id,
        userId: data.userId,
        startTime: (data.startTime as Timestamp).toDate(),
        endTime: (data.endTime as Timestamp).toDate(),
        dominantEmotion: data.dominantEmotion,
        wellnessScore: data.wellnessScore,
        emotionHistory: (data.emotionHistory || []).map((e: any) => ({
          emotion: e.emotion,
          timestamp: e.timestamp?.toDate ? e.timestamp.toDate() : new Date(),
          snippet: e.snippet
        })),
        transcript: data.transcript || [],
        summary: data.summary || '',
        durationMinutes: data.durationMinutes || 0
      } as SessionRecord;
    });
  } catch (err) {
    console.error('Firebase getSessions error:', err);
    return [];
  }
}

// ─── Mood entry helpers ───────────────────────────────────────────────────────

export async function saveMoodEntry(entry: Omit<MoodEntry, 'id'>): Promise<void> {
  try {
    const ref = collection(db, 'users', entry.userId, 'moods');
    await addDoc(ref, {
      ...entry,
      timestamp: Timestamp.fromDate(entry.timestamp)
    });
  } catch (err) {
    console.error('Firebase saveMoodEntry error:', err);
  }
}

export async function getTodayMoodEntry(userId: string): Promise<MoodEntry | null> {
  try {
    const ref = collection(db, 'users', userId, 'moods');
    const q = query(ref, orderBy('timestamp', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data() as DocumentData;
    const ts: Date = (data.timestamp as Timestamp).toDate();
    const today = new Date();
    const isToday =
      ts.getDate() === today.getDate() &&
      ts.getMonth() === today.getMonth() &&
      ts.getFullYear() === today.getFullYear();
    if (!isToday) return null;
    return { id: snapshot.docs[0].id, userId: data.userId, emotion: data.emotion, timestamp: ts };
  } catch (err) {
    console.error('Firebase getTodayMoodEntry error:', err);
    return null;
  }
}

export async function getRecentMoodEntries(userId: string, days = 7): Promise<MoodEntry[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const ref = collection(db, 'users', userId, 'moods');
    const q = query(ref, orderBy('timestamp', 'desc'), limit(days * 4));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(d => {
        const data = d.data() as DocumentData;
        return { id: d.id, userId: data.userId, emotion: data.emotion, timestamp: (data.timestamp as Timestamp).toDate() };
      })
      .filter(e => e.timestamp >= since);
  } catch (err) {
    console.error('Firebase getRecentMoodEntries error:', err);
    return [];
  }
}

// ─── User profile helpers ─────────────────────────────────────────────────────

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const userRef = doc(db, 'users', profile.userId);
    await setDoc(userRef, {
      ...profile,
      createdAt: Timestamp.fromDate(profile.createdAt)
    }, { merge: true });
  } catch (err) {
    console.error('Firebase saveUserProfile error:', err);
  }
}
