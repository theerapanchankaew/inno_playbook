import { db } from './firebase';
import {
  doc, setDoc, getDoc, collection, addDoc, getDocs, updateDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Deliverable {
  fieldId: string;
  content: string;
  capId: string;
  orgId?: string;
  initiativeId?: string; // NEW — primary context key
}

export interface Organization {
  id: string;
  name: string;
  sector: string;
  createdAt: unknown;
  deliverables: Deliverable[];
}

// ─── Organization CRUD ────────────────────────────────────────────────────────

export async function saveOrganization(orgId: string | null, name: string, sector: string) {
  if (!name) return null;
  if (orgId) {
    await updateDoc(doc(db, 'organizations', orgId), { name, sector });
    return { id: orgId, name, sector };
  } else {
    const docRef = await addDoc(collection(db, 'organizations'), {
      name,
      sector,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, name, sector };
  }
}

export async function getOrganizationData(orgId: string) {
  if (!orgId) return null;
  const orgSnap = await getDoc(doc(db, 'organizations', orgId));
  if (!orgSnap.exists()) return null;
  const q = query(collection(db, 'deliverables'), where('orgId', '==', orgId));
  const delivSnap = await getDocs(q);
  const deliverables = delivSnap.docs.map(d => d.data() as Deliverable);
  return { id: orgSnap.id, ...(orgSnap.data() as Omit<Organization, 'id' | 'deliverables'>), deliverables };
}

export async function getAllOrganizations(): Promise<Organization[]> {
  const q = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const orgs: Organization[] = [];
  for (const orgDoc of snap.docs) {
    const delivQ = query(collection(db, 'deliverables'), where('orgId', '==', orgDoc.id));
    const delivSnap = await getDocs(delivQ);
    orgs.push({
      id: orgDoc.id,
      ...(orgDoc.data() as Omit<Organization, 'id' | 'deliverables'>),
      deliverables: delivSnap.docs.map(d => d.data() as Deliverable),
    });
  }
  return orgs;
}

// ─── Legacy org-based deliverable (keep for admin/backward compat) ────────────

export async function saveDeliverable(
  orgId: string,
  capId: string,
  fieldId: string,
  content: string,
) {
  if (!orgId) return null;
  const deliverableId = `${orgId}_${fieldId}`;
  await setDoc(
    doc(db, 'deliverables', deliverableId),
    { orgId, capId, fieldId, content },
    { merge: true },
  );
  return { id: deliverableId };
}

// ─── Initiative-based deliverables (NEW — primary workflow) ──────────────────

/**
 * Save a deliverable for a specific initiative.
 * Document ID: {initiativeId}_{fieldId}
 * orgId is stored for admin queries / cross-ref.
 */
export async function saveInitiativeDeliverable(
  initiativeId: string,
  orgId: string,
  capId: string,
  fieldId: string,
  content: string,
): Promise<{ id: string }> {
  const deliverableId = `${initiativeId}_${fieldId}`;
  await setDoc(
    doc(db, 'deliverables', deliverableId),
    { initiativeId, orgId, capId, fieldId, content, updatedAt: serverTimestamp() },
    { merge: true },
  );
  return { id: deliverableId };
}

/**
 * Load all deliverables for an initiative (one-time fetch).
 * Returns a flat map: { fieldId → content }
 */
export async function getInitiativeDeliverables(
  initiativeId: string,
): Promise<Record<string, string>> {
  const q = query(collection(db, 'deliverables'), where('initiativeId', '==', initiativeId));
  const snap = await getDocs(q);
  const result: Record<string, string> = {};
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.fieldId && data.content !== undefined) {
      result[data.fieldId] = data.content;
    }
  });
  return result;
}

/**
 * Compute ISO 56001 readiness % for an initiative.
 */
export function calcInitiativeReadiness(
  deliverables: Record<string, string>,
  caps: { deliverables: { id: string }[] }[],
): number {
  const total = caps.reduce((a, c) => a + c.deliverables.length, 0);
  const filled = caps.reduce(
    (a, c) =>
      a + c.deliverables.filter(d => (deliverables[d.id] || '').trim().length > 15).length,
    0,
  );
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}
