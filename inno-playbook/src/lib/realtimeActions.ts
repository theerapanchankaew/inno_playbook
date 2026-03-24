import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  where,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { Organization } from './actions';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PresenceUser {
  userId: string;
  displayName: string;
  activeCap: string;
  since: number;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  displayName: string;
  action: string;
  target: string;
  detail?: string;
  timestamp: any;
}

export interface Comment {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  timestamp: any;
}

export interface Version {
  id: string;
  content: string;
  userId: string;
  displayName: string;
  timestamp: any;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  timestamp: any;
}

export interface Cohort {
  id: string;
  name: string;
  description: string;
  adminId: string;
  orgIds: string[];
  createdAt: any;
}

// ─── Presence ────────────────────────────────────────────────────────────────

export function subscribeToPresence(
  orgId: string,
  callback: (users: PresenceUser[]) => void,
): () => void {
  const col = collection(db, 'presence', orgId, 'users');
  return onSnapshot(col, (snap) => {
    const users: PresenceUser[] = snap.docs.map((d) => ({
      userId: d.id,
      ...(d.data() as Omit<PresenceUser, 'userId'>),
    }));
    callback(users);
  });
}

export async function setPresence(
  orgId: string,
  userId: string,
  displayName: string,
  activeCap: string,
): Promise<void> {
  await setDoc(doc(db, 'presence', orgId, 'users', userId), {
    displayName,
    activeCap,
    since: Date.now(),
  });
}

export async function clearPresence(orgId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, 'presence', orgId, 'users', userId));
}

// ─── Real-time deliverable listener ──────────────────────────────────────────

export function subscribeToDeliverables(
  orgId: string,
  callback: (data: Record<string, string>) => void,
): () => void {
  const q = query(collection(db, 'deliverables'), where('orgId', '==', orgId));
  return onSnapshot(q, (snap) => {
    const data: Record<string, string> = {};
    snap.docs.forEach((d) => {
      const doc = d.data();
      data[doc.fieldId] = doc.content;
    });
    callback(data);
  });
}

// ─── Activity feed ────────────────────────────────────────────────────────────

export async function logActivity(
  orgId: string,
  userId: string,
  displayName: string,
  action: string,
  target: string,
  detail?: string,
): Promise<void> {
  await addDoc(collection(db, 'activities', orgId, 'feed'), {
    userId,
    displayName,
    action,
    target,
    detail: detail ?? null,
    timestamp: serverTimestamp(),
  });
}

export function subscribeToActivity(
  orgId: string,
  limitCount: number,
  callback: (activities: ActivityEntry[]) => void,
): () => void {
  const q = query(
    collection(db, 'activities', orgId, 'feed'),
    orderBy('timestamp', 'desc'),
    limit(limitCount),
  );
  return onSnapshot(q, (snap) => {
    const activities: ActivityEntry[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ActivityEntry, 'id'>),
    }));
    callback(activities);
  });
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addComment(
  orgId: string,
  fieldId: string,
  userId: string,
  displayName: string,
  text: string,
): Promise<void> {
  const docKey = `${orgId}_${fieldId}`;
  await addDoc(collection(db, 'comments', docKey, 'items'), {
    userId,
    displayName,
    text,
    timestamp: serverTimestamp(),
  });
}

export function subscribeToComments(
  orgId: string,
  fieldId: string,
  callback: (comments: Comment[]) => void,
): () => void {
  const docKey = `${orgId}_${fieldId}`;
  const q = query(
    collection(db, 'comments', docKey, 'items'),
    orderBy('timestamp', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    const comments: Comment[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Comment, 'id'>),
    }));
    callback(comments);
  });
}

export async function deleteComment(
  orgId: string,
  fieldId: string,
  commentId: string,
): Promise<void> {
  const docKey = `${orgId}_${fieldId}`;
  await deleteDoc(doc(db, 'comments', docKey, 'items', commentId));
}

// ─── Version history ──────────────────────────────────────────────────────────

export async function saveVersion(
  orgId: string,
  fieldId: string,
  content: string,
  userId: string,
  displayName: string,
): Promise<void> {
  const docKey = `${orgId}_${fieldId}`;
  await addDoc(collection(db, 'versions', docKey, 'history'), {
    content,
    userId,
    displayName,
    timestamp: serverTimestamp(),
  });
}

export async function getVersionHistory(
  orgId: string,
  fieldId: string,
): Promise<Version[]> {
  const docKey = `${orgId}_${fieldId}`;
  const q = query(
    collection(db, 'versions', docKey, 'history'),
    orderBy('timestamp', 'desc'),
    limit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Version, 'id'>),
  }));
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  await addDoc(collection(db, 'notifications', userId, 'items'), {
    type,
    title,
    body,
    link: link ?? null,
    read: false,
    timestamp: serverTimestamp(),
  });
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void,
): () => void {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('timestamp', 'desc'),
    limit(30),
  );
  return onSnapshot(q, (snap) => {
    const notifications: AppNotification[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AppNotification, 'id'>),
    }));
    callback(notifications);
  });
}

export async function markNotificationRead(
  userId: string,
  notifId: string,
): Promise<void> {
  await updateDoc(doc(db, 'notifications', userId, 'items', notifId), {
    read: true,
  });
}

// ─── Cohorts ──────────────────────────────────────────────────────────────────

export async function createCohort(
  name: string,
  description: string,
  adminId: string,
): Promise<string> {
  const ref = await addDoc(collection(db, 'cohorts'), {
    name,
    description,
    adminId,
    orgIds: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function addOrgToCohort(cohortId: string, orgId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'cohorts', cohortId));
  if (!snap.exists()) return;
  const current: string[] = snap.data().orgIds ?? [];
  if (!current.includes(orgId)) {
    await updateDoc(doc(db, 'cohorts', cohortId), {
      orgIds: [...current, orgId],
    });
  }
}

export async function removeOrgFromCohort(cohortId: string, orgId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'cohorts', cohortId));
  if (!snap.exists()) return;
  const current: string[] = snap.data().orgIds ?? [];
  await updateDoc(doc(db, 'cohorts', cohortId), {
    orgIds: current.filter((id) => id !== orgId),
  });
}

export async function getCohorts(): Promise<Cohort[]> {
  const q = query(collection(db, 'cohorts'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Cohort, 'id'>),
  }));
}

export async function getCohortOrgs(cohortId: string): Promise<Organization[]> {
  const snap = await getDoc(doc(db, 'cohorts', cohortId));
  if (!snap.exists()) return [];
  const orgIds: string[] = snap.data().orgIds ?? [];
  const orgs: Organization[] = [];
  for (const orgId of orgIds) {
    const orgSnap = await getDoc(doc(db, 'organizations', orgId));
    if (orgSnap.exists()) {
      const delivQ = query(
        collection(db, 'deliverables'),
        where('orgId', '==', orgId),
      );
      const delivSnap = await getDocs(delivQ);
      orgs.push({
        id: orgSnap.id,
        ...(orgSnap.data() as Omit<Organization, 'id' | 'deliverables'>),
        deliverables: delivSnap.docs.map((d) => d.data() as any),
      });
    }
  }
  return orgs;
}
