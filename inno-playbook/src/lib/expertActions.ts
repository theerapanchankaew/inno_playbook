import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Expert {
  id: string;
  name: string;
  title: string;
  organization: string;
  bio: string;
  specializations: string[];   // e.g. ['ISO 56001', 'Design Thinking', 'Lean Startup']
  industries: string[];        // e.g. ['Healthcare', 'Manufacturing']
  availability: 'available' | 'limited' | 'unavailable';
  contactEmail: string;
  linkedIn?: string;
  avatarInitials: string;      // derived: first letters of name
  avatarColor: string;         // hex
  rating: number;              // 0–5
  sessionsCount: number;
  createdBy: string;           // userId of admin who added
  createdAt: any;
}

export interface ConnectionRequest {
  id: string;
  expertId: string;
  expertName: string;
  orgId: string;
  orgName: string;
  userId: string;
  userName: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
  respondedAt?: any;
}

// ─── Avatar color palette ─────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#0B7B74', '#2563EB', '#7C3AED', '#D97706',
  '#DC2626', '#059669', '#0891B2', '#9333EA',
];

function pickColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Expert CRUD ──────────────────────────────────────────────────────────────

export async function createExpert(
  data: Omit<Expert, 'id' | 'avatarInitials' | 'avatarColor' | 'rating' | 'sessionsCount' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'experts'), {
    ...data,
    avatarInitials: initials(data.name),
    avatarColor: pickColor(data.name),
    rating: 0,
    sessionsCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getExperts(): Promise<Expert[]> {
  const q = query(collection(db, 'experts'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Expert, 'id'>),
  }));
}

export async function getExpert(expertId: string): Promise<Expert | null> {
  const snap = await getDoc(doc(db, 'experts', expertId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Expert, 'id'>) };
}

export async function updateExpert(
  expertId: string,
  updates: Partial<Omit<Expert, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'experts', expertId), updates);
}

export async function deleteExpert(expertId: string): Promise<void> {
  await deleteDoc(doc(db, 'experts', expertId));
}

// ─── Connection Requests ──────────────────────────────────────────────────────

export async function requestConnection(
  expertId: string,
  expertName: string,
  orgId: string,
  orgName: string,
  userId: string,
  userName: string,
  message: string,
): Promise<string> {
  const ref = await addDoc(collection(db, 'connections'), {
    expertId,
    expertName,
    orgId,
    orgName,
    userId,
    userName,
    message,
    status: 'pending',
    createdAt: serverTimestamp(),
    respondedAt: null,
  });
  return ref.id;
}

export async function getMyRequests(userId: string): Promise<ConnectionRequest[]> {
  const q = query(
    collection(db, 'connections'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ConnectionRequest, 'id'>),
  }));
}

export async function getAllRequests(): Promise<ConnectionRequest[]> {
  const q = query(collection(db, 'connections'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ConnectionRequest, 'id'>),
  }));
}

export async function respondToRequest(
  requestId: string,
  status: 'accepted' | 'declined',
): Promise<void> {
  await updateDoc(doc(db, 'connections', requestId), {
    status,
    respondedAt: serverTimestamp(),
  });
}

// ─── Seed data (for demo/admin use) ──────────────────────────────────────────

export const SEED_EXPERTS: Omit<Expert, 'id' | 'avatarInitials' | 'avatarColor' | 'rating' | 'sessionsCount' | 'createdAt'>[] = [
  {
    name: 'Dr. Somchai Wattanakul',
    title: 'Innovation Strategy Advisor',
    organization: 'NSTDA Thailand',
    bio: 'Pioneering ISO 56001 implementation across Southeast Asia with 15+ years in innovation management. Helped 40+ organizations achieve certification readiness.',
    specializations: ['ISO 56001', 'Innovation Strategy', 'Organizational Design'],
    industries: ['Manufacturing', 'Healthcare', 'Government'],
    availability: 'available',
    contactEmail: 'somchai@example.com',
    linkedIn: 'https://linkedin.com',
    createdBy: 'system',
  },
  {
    name: 'Assoc. Prof. Narumol Pongpitch',
    title: 'Design Thinking Facilitator',
    organization: 'Chulalongkorn University',
    bio: 'Design Thinking and Human-Centered Innovation expert. Certified IDEO facilitator with deep experience in healthcare and education innovation.',
    specializations: ['Design Thinking', 'Human-Centered Design', 'Workshop Facilitation'],
    industries: ['Healthcare', 'Education', 'FinTech'],
    availability: 'available',
    contactEmail: 'narumol@example.com',
    createdBy: 'system',
  },
  {
    name: 'Krit Phanthuwong',
    title: 'Corporate Innovation Lead',
    organization: 'SCG Innovation Hub',
    bio: 'Built SCG\'s corporate innovation ecosystem from scratch. Expert in portfolio management, stage-gate processes, and innovation culture transformation.',
    specializations: ['Portfolio Management', 'Corporate Innovation', 'Lean Startup'],
    industries: ['Manufacturing', 'Construction', 'Energy'],
    availability: 'limited',
    contactEmail: 'krit@example.com',
    createdBy: 'system',
  },
  {
    name: 'Dr. Wipawan Techapreechawong',
    title: 'Digital Transformation Consultant',
    organization: 'Deloitte Thailand',
    bio: 'Specializing in technology-driven innovation and digital transformation strategy. Expertise in AI/ML integration into innovation processes.',
    specializations: ['Digital Transformation', 'AI Strategy', 'Agile Innovation'],
    industries: ['Banking', 'Retail', 'Logistics'],
    availability: 'available',
    contactEmail: 'wipawan@example.com',
    createdBy: 'system',
  },
];
