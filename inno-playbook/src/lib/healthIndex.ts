import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { CAPS } from './data';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IHIDimension {
  key: string;
  name: string;
  score: number; // 0–100
  color: string;
  icon: string;
  capIds: string[];
}

export interface IHIResult {
  overall: number;
  dimensions: IHIDimension[];
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  gradeColor: string;
  interpretation: string;
}

export interface IHISnapshot {
  id: string;
  date: string;
  overall: number;
  dimensions: { key: string; score: number }[];
  timestamp: any;
}

// ─── Dimension definitions (mapped to ISO 56001 CAP groups) ───────────────────

const DIMENSIONS: Omit<IHIDimension, 'score'>[] = [
  {
    key: 'strategic',
    name: 'Strategic Alignment',
    color: '#0B7B74',
    icon: '🎯',
    capIds: ['C1', 'C2'],
  },
  {
    key: 'opportunity',
    name: 'Opportunity Pipeline',
    color: '#2563EB',
    icon: '🔍',
    capIds: ['C3'],
  },
  {
    key: 'execution',
    name: 'Execution Readiness',
    color: '#7C3AED',
    icon: '⚙️',
    capIds: ['C4', 'C5'],
  },
  {
    key: 'learning',
    name: 'Learning Velocity',
    color: '#D97706',
    icon: '📚',
    capIds: ['C6'],
  },
  {
    key: 'ecosystem',
    name: 'Ecosystem & Culture',
    color: '#DC2626',
    icon: '🌐',
    capIds: ['C7', 'C8'],
  },
];

// ─── Grading ──────────────────────────────────────────────────────────────────

function getGrade(score: number): {
  grade: IHIResult['grade'];
  gradeColor: string;
  interpretation: string;
} {
  if (score >= 85) return { grade: 'S', gradeColor: '#0B7B74', interpretation: 'World-class — Ready for ISO 56001 certification' };
  if (score >= 70) return { grade: 'A', gradeColor: '#2563EB', interpretation: 'Advanced — Strong innovation management capability' };
  if (score >= 55) return { grade: 'B', gradeColor: '#7C3AED', interpretation: 'Developing — Solid foundation, key gaps to close' };
  if (score >= 35) return { grade: 'C', gradeColor: '#D97706', interpretation: 'Emerging — Significant gaps, focused effort needed' };
  return { grade: 'D', gradeColor: '#DC2626', interpretation: 'Nascent — Fundamental capability building required' };
}

// ─── Scoring engine ───────────────────────────────────────────────────────────

export function calcIHI(data: Record<string, string>): IHIResult {
  const dimensions: IHIDimension[] = DIMENSIONS.map((dim) => {
    const caps = CAPS.filter((c) => dim.capIds.includes(c.id));
    if (caps.length === 0) return { ...dim, score: 0 };

    const total = caps.reduce((s, c) => s + c.deliverables.length, 0);
    const filled = caps.reduce(
      (s, c) =>
        s +
        c.deliverables.filter((d) => {
          const content = (data[d.id] || '').trim();
          // Quality scoring: > 15 chars = partial, > 80 chars = full
          if (content.length >= 80) return 1;
          if (content.length >= 15) return 0.6;
          return 0;
        }).length,
      0,
    );
    const score = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;
    return { ...dim, score };
  });

  const overall = Math.round(
    dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length,
  );

  const { grade, gradeColor, interpretation } = getGrade(overall);

  return { overall, dimensions, grade, gradeColor, interpretation };
}

// ─── Firestore persistence ────────────────────────────────────────────────────

export async function saveHealthSnapshot(
  orgId: string,
  data: Record<string, string>,
): Promise<void> {
  try {
    const { overall, dimensions } = calcIHI(data);
    await addDoc(collection(db, 'health_snapshots', orgId, 'snapshots'), {
      date: new Date().toISOString().split('T')[0],
      overall,
      dimensions: dimensions.map((d) => ({ key: d.key, score: d.score })),
      timestamp: serverTimestamp(),
    });
  } catch {
    // non-blocking — don't crash app on snapshot save failure
  }
}

export async function getHealthTrend(
  orgId: string,
  days = 30,
): Promise<IHISnapshot[]> {
  try {
    const q = query(
      collection(db, 'health_snapshots', orgId, 'snapshots'),
      orderBy('timestamp', 'desc'),
      limit(days),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<IHISnapshot, 'id'>) }))
      .reverse();
  } catch {
    return [];
  }
}
