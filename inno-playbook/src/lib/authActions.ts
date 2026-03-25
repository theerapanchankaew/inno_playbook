import { db } from './firebase';
import {
  doc, setDoc, getDoc, updateDoc, collection,
  query, where, getDocs, serverTimestamp, onSnapshot,
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'org_admin' | 'facilitator' | 'member' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  orgId?: string;       // Primary org ที่ user เป็นเจ้าของ / สังกัด
  createdAt: unknown;
  lastActive: unknown;
}

// ─── Create user profile (เรียกหลัง register) ─────────────────────────────────

export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
): Promise<UserProfile> {
  const profile: Omit<UserProfile, 'uid'> = {
    email,
    displayName,
    role: 'member',
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp(),
  };
  await setDoc(doc(db, 'users', uid), profile);
  return { uid, ...profile };
}

// ─── Get user profile ──────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...(snap.data() as Omit<UserProfile, 'uid'>) };
}

// ─── Update last active ────────────────────────────────────────────────────────

export async function touchLastActive(uid: string) {
  await updateDoc(doc(db, 'users', uid), { lastActive: serverTimestamp() });
}

// ─── Save orgId to user profile ────────────────────────────────────────────────

export async function linkOrgToUser(uid: string, orgId: string) {
  await updateDoc(doc(db, 'users', uid), { orgId });
}

// ─── Get org belonging to user ─────────────────────────────────────────────────

export async function getUserOrgId(uid: string): Promise<string | null> {
  const profile = await getUserProfile(uid);
  return profile?.orgId ?? null;
}

// ─── Update display name ───────────────────────────────────────────────────────

export async function updateDisplayName(uid: string, displayName: string) {
  await updateDoc(doc(db, 'users', uid), { displayName });
}

// ─── Get all users (super_admin only) ─────────────────────────────────────────

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) }));
}

// ─── Update user role (super_admin only) ──────────────────────────────────────

export async function updateUserRole(uid: string, role: UserRole) {
  await updateDoc(doc(db, 'users', uid), { role });
}

// ─── Check if any super_admin exists (first-time setup) ───────────────────────

export async function hasSuperAdmin(): Promise<boolean> {
  const q = query(collection(db, 'users'), where('role', '==', 'super_admin'));
  const snap = await getDocs(q);
  return !snap.empty;
}

// ─── Get users by role ─────────────────────────────────────────────────────────

export async function getUsersByRole(role: UserRole): Promise<UserProfile[]> {
  const q = query(collection(db, 'users'), where('role', '==', role));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) }));
}

// ─── Update user profile fields ────────────────────────────────────────────────

export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'role' | 'orgId'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), updates);
}

// ─── Subscribe to all users realtime ──────────────────────────────────────────

export function subscribeToUsers(
  callback: (users: UserProfile[]) => void
): () => void {
  return onSnapshot(collection(db, 'users'), snap => {
    callback(snap.docs.map(d => ({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) })));
  });
}
