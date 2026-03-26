import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InitiativeStatus = 'draft' | 'active' | 'review' | 'approved' | 'archived';
export type InitiativePriority = 'low' | 'medium' | 'high' | 'critical';
export type InitiativeType =
  | 'product'
  | 'process'
  | 'service'
  | 'business_model'
  | 'technology'
  | 'social';

export interface InitiativeKPI {
  name: string;
  target: string;
  current?: string;
}

export interface InitiativeMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface Initiative {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: InitiativeStatus;
  priority: InitiativePriority;
  type: InitiativeType;
  ownerName: string;
  ownerId: string;
  targetDate: string;
  budget?: number;
  tags: string[];
  linkedCapId?: string;
  overallProgress: number; // 0–100
  kpis: InitiativeKPI[];
  milestones: InitiativeMilestone[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  createdBy: string;
}

export type InitiativeInput = Omit<Initiative, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Status metadata ──────────────────────────────────────────────────────────

export const STATUS_META: Record<InitiativeStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',    color: '#64748B', bg: '#F1F5F9' },
  active:   { label: 'Active',   color: '#0B7B74', bg: '#E6F7F6' },
  review:   { label: 'Review',   color: '#D97706', bg: '#FFF7ED' },
  approved: { label: 'Approved', color: '#059669', bg: '#F0FDF4' },
  archived: { label: 'Archived', color: '#94A3B8', bg: '#F8FAFC' },
};

export const PRIORITY_META: Record<InitiativePriority, { label: string; color: string; bg: string }> = {
  low:      { label: 'Low',      color: '#64748B', bg: '#F1F5F9' },
  medium:   { label: 'Medium',   color: '#2563EB', bg: '#EFF6FF' },
  high:     { label: 'High',     color: '#D97706', bg: '#FFF7ED' },
  critical: { label: 'Critical', color: '#DC2626', bg: '#FFF1F2' },
};

export const TYPE_META: Record<InitiativeType, { label: string; emoji: string }> = {
  product:        { label: 'Product Innovation',        emoji: '📦' },
  process:        { label: 'Process Innovation',        emoji: '⚙️' },
  service:        { label: 'Service Innovation',        emoji: '🤝' },
  business_model: { label: 'Business Model Innovation', emoji: '💡' },
  technology:     { label: 'Technology Innovation',     emoji: '🔬' },
  social:         { label: 'Social Innovation',         emoji: '🌱' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip all undefined values so Firestore doesn't throw */
function clean<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

// ─── CRUD Operations ──────────────────────────────────────────────────────────

/** Create a new initiative */
export async function createInitiative(input: InitiativeInput): Promise<string> {
  const ref = await addDoc(collection(db, 'initiatives'), {
    ...clean(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update an existing initiative (partial) */
export async function updateInitiative(
  id: string,
  updates: Partial<Omit<Initiative, 'id' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'initiatives', id), {
    ...clean(updates),
    updatedAt: serverTimestamp(),
  });
}

/** Delete an initiative */
export async function deleteInitiative(id: string): Promise<void> {
  await deleteDoc(doc(db, 'initiatives', id));
}

/** Get a single initiative */
export async function getInitiative(id: string): Promise<Initiative | null> {
  const snap = await getDoc(doc(db, 'initiatives', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Initiative, 'id'>) };
}

/** Get all initiatives for an org */
export async function getInitiativesByOrg(orgId: string): Promise<Initiative[]> {
  // No orderBy → no composite index needed; sort client-side
  const q = query(
    collection(db, 'initiatives'),
    where('orgId', '==', orgId),
  );
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Initiative, 'id'>) }));
  return items.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

/** Subscribe to initiatives (real-time)
 *  - orgId = null  → super_admin: load ALL initiatives across all orgs
 *  - orgId = string → normal user: load only their org's initiatives
 */
export function subscribeToInitiatives(
  orgId: string | null,
  callback: (items: Initiative[]) => void
): () => void {
  // No orderBy → no composite index needed; sort client-side by createdAt desc
  const q = orgId
    ? query(collection(db, 'initiatives'), where('orgId', '==', orgId))
    : query(collection(db, 'initiatives')); // super_admin: all initiatives
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Initiative, 'id'>) }));
    callback(items.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)));
  });
}

/** Update progress & status quickly (from Kanban drag etc.) */
export async function updateInitiativeStatus(id: string, status: InitiativeStatus): Promise<void> {
  await updateDoc(doc(db, 'initiatives', id), { status, updatedAt: serverTimestamp() });
}

export async function updateInitiativeProgress(id: string, progress: number): Promise<void> {
  await updateDoc(doc(db, 'initiatives', id), {
    overallProgress: Math.min(100, Math.max(0, progress)),
    updatedAt: serverTimestamp(),
  });
}

/** Toggle milestone completion */
export async function toggleMilestone(
  id: string,
  milestoneId: string,
  milestones: InitiativeMilestone[]
): Promise<void> {
  const updated = milestones.map(m =>
    m.id === milestoneId ? { ...m, completed: !m.completed } : m
  );
  const progress = Math.round(
    (updated.filter(m => m.completed).length / updated.length) * 100
  );
  await updateDoc(doc(db, 'initiatives', id), {
    milestones: updated,
    overallProgress: progress,
    updatedAt: serverTimestamp(),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function blankInitiative(orgId: string, ownerId: string, ownerName: string): InitiativeInput {
  return {
    orgId,
    title: '',
    description: '',
    status: 'draft',
    priority: 'medium',
    type: 'product',
    ownerId,
    ownerName,
    targetDate: '',
    budget: undefined,
    tags: [],
    linkedCapId: '',
    overallProgress: 0,
    kpis: [{ name: '', target: '' }],
    milestones: [],
    createdBy: ownerId,
  };
}
