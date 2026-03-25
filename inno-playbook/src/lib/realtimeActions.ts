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

// ─── Real-time deliverable listeners ─────────────────────────────────────────

/** Legacy: subscribe by orgId */
export function subscribeToDeliverables(
  orgId: string,
  callback: (data: Record<string, string>) => void,
): () => void {
  const q = query(collection(db, 'deliverables'), where('orgId', '==', orgId));
  return onSnapshot(q, (snap) => {
    const data: Record<string, string> = {};
    snap.docs.forEach((d) => { const row = d.data(); data[row.fieldId] = row.content; });
    callback(data);
  });
}

/** NEW: subscribe by initiativeId (primary workspace flow) */
export function subscribeToInitiativeDeliverables(
  initiativeId: string,
  callback: (data: Record<string, string>) => void,
): () => void {
  const q = query(collection(db, 'deliverables'), where('initiativeId', '==', initiativeId));
  return onSnapshot(q, (snap) => {
    const data: Record<string, string> = {};
    snap.docs.forEach((d) => { const row = d.data(); data[row.fieldId] = row.content; });
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

// ─── Community ────────────────────────────────────────────────────────────────
// Collections: community_ideas/{ideaId}, community_discussions/{threadId}

export interface CommunityIdea {
  id: string;
  orgId: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  category: string;         // 'product' | 'process' | 'service' | 'technology' | 'other'
  votes: string[];          // array of userIds who upvoted
  tags: string[];
  linkedInitiativeId?: string;
  status: 'open' | 'in_review' | 'adopted' | 'closed';
  createdAt: any;
  updatedAt: any;
}

export interface DiscussionThread {
  id: string;
  orgId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  category: string;
  replyCount: number;
  pinned: boolean;
  createdAt: any;
}

export interface DiscussionReply {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: any;
}

// Ideas CRUD
export async function createIdea(
  orgId: string,
  authorId: string,
  authorName: string,
  title: string,
  description: string,
  category: string,
  tags: string[],
): Promise<string> {
  const ref = await addDoc(collection(db, 'community_ideas'), {
    orgId, authorId, authorName, title, description,
    category, tags, votes: [], status: 'open',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateIdea(
  ideaId: string,
  updates: Partial<Pick<CommunityIdea, 'title' | 'description' | 'category' | 'tags' | 'status' | 'linkedInitiativeId'>>,
): Promise<void> {
  await updateDoc(doc(db, 'community_ideas', ideaId), { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteIdea(ideaId: string): Promise<void> {
  await deleteDoc(doc(db, 'community_ideas', ideaId));
}

export async function toggleIdeaVote(ideaId: string, userId: string, currentVotes: string[]): Promise<void> {
  const voted = currentVotes.includes(userId);
  const newVotes = voted ? currentVotes.filter(id => id !== userId) : [...currentVotes, userId];
  await updateDoc(doc(db, 'community_ideas', ideaId), { votes: newVotes });
}

export function subscribeToIdeas(
  orgId: string,
  callback: (ideas: CommunityIdea[]) => void,
): () => void {
  // No orderBy → no composite index required; sort client-side
  const q = query(
    collection(db, 'community_ideas'),
    where('orgId', '==', orgId),
  );
  return onSnapshot(q, snap => {
    const ideas = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as Omit<CommunityIdea, 'id'>) }))
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
    callback(ideas);
  });
}

// Discussions CRUD
export async function createDiscussion(
  orgId: string,
  authorId: string,
  authorName: string,
  title: string,
  body: string,
  category: string,
): Promise<string> {
  const ref = await addDoc(collection(db, 'community_discussions'), {
    orgId, authorId, authorName, title, body,
    category, replyCount: 0, pinned: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteDiscussion(threadId: string): Promise<void> {
  await deleteDoc(doc(db, 'community_discussions', threadId));
}

export function subscribeToDiscussions(
  orgId: string,
  callback: (threads: DiscussionThread[]) => void,
): () => void {
  // No orderBy → no composite index required; sort client-side
  const q = query(
    collection(db, 'community_discussions'),
    where('orgId', '==', orgId),
  );
  return onSnapshot(q, snap => {
    const threads = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as Omit<DiscussionThread, 'id'>) }))
      .sort((a, b) => {
        // Pinned threads first, then by createdAt desc
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
    callback(threads);
  });
}

export async function addReply(
  threadId: string,
  authorId: string,
  authorName: string,
  body: string,
): Promise<void> {
  await addDoc(collection(db, 'community_discussions', threadId, 'replies'), {
    authorId, authorName, body, createdAt: serverTimestamp(),
  });
  const ref = doc(db, 'community_discussions', threadId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { replyCount: (snap.data().replyCount ?? 0) + 1 });
  }
}

export function subscribeToReplies(
  threadId: string,
  callback: (replies: DiscussionReply[]) => void,
): () => void {
  // No orderBy → no index required; sort client-side asc
  const q = query(
    collection(db, 'community_discussions', threadId, 'replies'),
  );
  return onSnapshot(q, snap => {
    const replies = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as Omit<DiscussionReply, 'id'>) }))
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return ta - tb;
      });
    callback(replies);
  });
}
