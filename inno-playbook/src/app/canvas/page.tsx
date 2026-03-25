'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { getUserOrgId } from '@/lib/authActions';
import UserMenu from '@/components/UserMenu';
import GlobalNav from '@/components/GlobalNav';

// ─── Types ────────────────────────────────────────────────────────────────────

type NoteColor = 'yellow' | 'teal' | 'blue' | 'purple' | 'red' | 'green';

interface CanvasNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: NoteColor;
  tag: string;
  createdBy: string;
}

const NOTE_COLORS: Record<NoteColor, { bg: string; border: string; text: string; label: string }> = {
  yellow: { bg: '#FEFCE8', border: '#F59E0B', text: '#78350F', label: 'Yellow' },
  teal:   { bg: '#F0FDFA', border: '#14B8A6', text: '#134E4A', label: 'Teal' },
  blue:   { bg: '#EFF6FF', border: '#3B82F6', text: '#1E3A5F', label: 'Blue' },
  purple: { bg: '#FAF5FF', border: '#A855F7', text: '#4C1D95', label: 'Purple' },
  red:    { bg: '#FFF1F2', border: '#F43F5E', text: '#7F1D1D', label: 'Red' },
  green:  { bg: '#F0FDF4', border: '#22C55E', text: '#14532D', label: 'Green' },
};

const NOTE_TAGS = [
  '', '💡 Insight', '🎯 Opportunity', '⚠️ Risk',
  '✅ Action', '❓ Question', '🔗 Link', '📌 Key Point',
];

const W = 200;
const H = 130;

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CanvasPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [orgId, setOrgId]               = useState<string | null>(null);
  const [nodes, setNodes]               = useState<CanvasNode[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editText, setEditText]         = useState('');
  const [activeColor, setActiveColor]   = useState<NoteColor>('yellow');
  const [toast, setToast]               = useState('');
  const [pan, setPan]                   = useState({ x: 60, y: 60 });
  const [zoom, setZoom]                 = useState(1);

  // ── Refs (avoid stale closure, mutable without re-render) ─────────────────
  const orgIdRef       = useRef<string | null>(null);
  const userRef        = useRef(user);
  const activeColorRef = useRef(activeColor);
  const panRef         = useRef(pan);
  const zoomRef        = useRef(zoom);
  const viewportRef    = useRef<HTMLDivElement>(null);
  const isDragging     = useRef(false);
  const dragId         = useRef<string | null>(null);
  const dragStart      = useRef({ mx: 0, my: 0, nx: 0, ny: 0 });
  const isPanning      = useRef(false);
  const panStart       = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // Keep refs in sync
  useEffect(() => { orgIdRef.current       = orgId;       }, [orgId]);
  useEffect(() => { userRef.current        = user;        }, [user]);
  useEffect(() => { activeColorRef.current = activeColor; }, [activeColor]);
  useEffect(() => { panRef.current         = pan;         }, [pan]);
  useEffect(() => { zoomRef.current        = zoom;        }, [zoom]);

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || authLoading) return;
    const cached = localStorage.getItem(`innoPB_orgId_${user.uid}`);
    if (cached) { setOrgId(cached); return; }
    getUserOrgId(user.uid).then(id => {
      if (id) {
        setOrgId(id);
        localStorage.setItem(`innoPB_orgId_${user.uid}`, id);
      } else if (profile?.role === 'super_admin') {
        setOrgId(user.uid);
      }
    });
  }, [user, authLoading, profile?.role]);

  // ── Load from Firestore (with fallback) ────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;

    // First: try live subscription
    const q = query(collection(db, 'canvases', orgId, 'nodes'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        // Merge: keep local-only nodes (id starts with timestamp pattern), add Firestore nodes
        setNodes(prev => {
          const firestoreNodes = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<CanvasNode, 'id'>),
          }));
          // Keep local nodes that aren't yet in Firestore
          const localOnly = prev.filter(n => !firestoreNodes.some(f => f.id === n.id));
          return [...firestoreNodes, ...localOnly];
        });
      },
      (err) => {
        // Firestore rules not yet deployed → fall back to getDocs once
        console.warn('Canvas: onSnapshot error (rules may not be deployed):', err.message);
        getDocs(q)
          .then(snap => setNodes(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CanvasNode, 'id'>) }))))
          .catch(() => {/* offline or no rules – local state is fine */});
      },
    );
    return () => unsub();
  }, [orgId]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, ms = 3500) => {
    setToast(msg);
    setTimeout(() => setToast(''), ms);
  }, []);

  // ── Sync one node to Firestore (fire-and-forget) ───────────────────────────
  const syncNode = useCallback((node: CanvasNode) => {
    const oid = orgIdRef.current;
    if (!oid) return;
    setDoc(doc(db, 'canvases', oid, 'nodes', node.id), {
      x: node.x, y: node.y, w: node.w, h: node.h,
      text: node.text, color: node.color, tag: node.tag,
      createdBy: node.createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(err => {
      console.warn('Canvas: sync failed –', err.message);
      showToast('⚠️ Note saved locally — deploy Firestore rules to sync across devices');
    });
  }, [showToast]);

  // ── Add note: OPTIMISTIC — note appears instantly, Firestore in background ──
  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging.current) return;

    const oid  = orgIdRef.current;
    const usr  = userRef.current;
    const col  = activeColorRef.current;

    if (!oid || !usr) {
      showToast('⚠️ ยังไม่ได้ตั้งค่าองค์กร — ไปที่ Initiatives เพื่อสร้างองค์กรก่อน');
      return;
    }

    // Calculate canvas coordinates
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
    const y = (e.clientY - rect.top  - panRef.current.y) / zoomRef.current;

    // 1. Create note locally — appears IMMEDIATELY
    const newNode: CanvasNode = {
      id: uid(), x, y, w: W, h: H,
      text: '', color: col, tag: '',
      createdBy: usr.uid,
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedId(newNode.id);
    setEditingId(newNode.id);
    setEditText('');

    // 2. Persist to Firestore in background (does not block UI)
    syncNode(newNode);
  }, [showToast, syncNode]);

  // ── Delete note ────────────────────────────────────────────────────────────
  const deleteNote = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setSelectedId(s  => s  === id ? null : s);
    setEditingId(ei => ei === id ? null : ei);

    const oid = orgIdRef.current;
    if (oid) {
      deleteDoc(doc(db, 'canvases', oid, 'nodes', id)).catch(() => {});
    }
  }, []);

  // ── Save text ──────────────────────────────────────────────────────────────
  const saveText = useCallback((id: string, text: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
    setEditingId(null);

    const oid = orgIdRef.current;
    if (oid) {
      updateDoc(doc(db, 'canvases', oid, 'nodes', id), {
        text, updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  }, []);

  // ── Change color ───────────────────────────────────────────────────────────
  const changeColor = useCallback((id: string, color: NoteColor) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, color } : n));
    const oid = orgIdRef.current;
    if (oid) updateDoc(doc(db, 'canvases', oid, 'nodes', id), { color }).catch(() => {});
  }, []);

  // ── Change tag ─────────────────────────────────────────────────────────────
  const changeTag = useCallback((id: string, tag: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, tag } : n));
    const oid = orgIdRef.current;
    if (oid) updateDoc(doc(db, 'canvases', oid, 'nodes', id), { tag }).catch(() => {});
  }, []);

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const onViewportMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = false;
    dragId.current     = null;

    if (e.button === 1 || e.altKey) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current  = { mx: e.clientX, my: e.clientY, px: panRef.current.x, py: panRef.current.y };
    } else {
      setSelectedId(null);
    }
  }, []);

  const onNoteMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    isDragging.current = false;
    dragId.current     = nodeId;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragStart.current  = { mx: e.clientX, my: e.clientY, nx: node.x, ny: node.y };
    setSelectedId(nodeId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragId.current !== null) {
      const dx = (e.clientX - dragStart.current.mx) / zoomRef.current;
      const dy = (e.clientY - dragStart.current.my) / zoomRef.current;
      if (!isDragging.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDragging.current = true;
      }
      if (isDragging.current) {
        const nx = dragStart.current.nx + dx;
        const ny = dragStart.current.ny + dy;
        setNodes(prev => prev.map(n => n.id === dragId.current ? { ...n, x: nx, y: ny } : n));
      }
    } else if (isPanning.current) {
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.mx),
        y: panStart.current.py + (e.clientY - panStart.current.my),
      });
    }
  }, []);

  const onMouseUp = useCallback(() => {
    // Persist position after drag
    if (dragId.current && isDragging.current) {
      const oid  = orgIdRef.current;
      const id   = dragId.current;
      setNodes(prev => {
        const node = prev.find(n => n.id === id);
        if (node && oid) {
          updateDoc(doc(db, 'canvases', oid, 'nodes', id), { x: node.x, y: node.y }).catch(() => {});
        }
        return prev;
      });
    }
    // Always reset — critical fix
    isDragging.current = false;
    dragId.current     = null;
    isPanning.current  = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(2.5, Math.max(0.25, z * (e.deltaY > 0 ? 0.92 : 1.09))));
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authLoading || !profile) {
    return (
      <div className="canvas-loading">
        <span className="logo-badge">MASCI · ISO 56001</span>
        <div style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 12, marginTop: 12 }}>
          Loading Canvas…
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="canvas-page gnav-offset">
      <GlobalNav />

      {/* ── Topbar ────────────────────────────────────────────────────────── */}
      <div className="canvas-topbar">
        <div className="canvas-topbar-left">
          <span className="logo-badge">MASCI · ISO 56001</span>
          <span className="canvas-topbar-title">🗺️ Innovation Canvas</span>
          <span className="canvas-topbar-badge">{nodes.length} notes</span>
        </div>
        <div className="canvas-topbar-actions">
          <span className="canvas-hint">
            Double-click = add note · Drag = move · Alt+drag = pan · Scroll = zoom
          </span>
          <div className="canvas-zoom-ctrl">
            <button className="canvas-zoom-btn" onClick={() => setZoom(z => Math.max(0.25, z - 0.1))}>−</button>
            <span className="canvas-zoom-val">{Math.round(zoom * 100)}%</span>
            <button className="canvas-zoom-btn" onClick={() => setZoom(z => Math.min(2.5, z + 0.1))}>+</button>
            <button className="canvas-zoom-btn" title="Reset view" onClick={() => { setZoom(1); setPan({ x: 60, y: 60 }); }}>⌂</button>
          </div>
          <Link href="/dashboard" className="canvas-nav-link">📊 Dashboard</Link>
          <Link href="/experts"   className="canvas-nav-link">👥 Experts</Link>
          <Link href="/initiatives" className="canvas-nav-link">🚀 Initiatives</Link>
          <UserMenu />
        </div>
      </div>

      {/* ── Color palette ─────────────────────────────────────────────────── */}
      <div className="canvas-legend">
        <span className="canvas-legend-tip">Color:</span>
        {(Object.entries(NOTE_COLORS) as [NoteColor, typeof NOTE_COLORS[NoteColor]][]).map(([key, c]) => (
          <button
            key={key}
            className={`canvas-legend-swatch ${activeColor === key ? 'selected' : ''}`}
            style={{ background: c.bg, border: `2px solid ${activeColor === key ? '#0B7B74' : c.border}`, color: c.text }}
            onClick={() => setActiveColor(key)}
            title={c.label}
          >
            {c.label}
          </button>
        ))}
        <div className="canvas-legend-divider" />
        <span className="canvas-legend-tip" style={{ color: '#0B7B74', fontWeight: 700 }}>
          ✦ Double-click on canvas to add a note
        </span>
      </div>

      {/* ── No org warning ────────────────────────────────────────────────── */}
      {!orgId && !authLoading && (
        <div className="canvas-empty-org">
          <div style={{ fontSize: 48 }}>🗺️</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--navy)' }}>ยังไม่ได้ตั้งค่าองค์กร</div>
          <div style={{ color: 'var(--muted)', marginTop: 8 }}>
            ไปที่ <Link href="/initiatives" style={{ color: 'var(--teal)' }}>Initiatives</Link> เพื่อตั้งค่าองค์กรก่อนใช้งาน Canvas
          </div>
        </div>
      )}

      {/* ── Canvas viewport ───────────────────────────────────────────────── */}
      {(orgId || nodes.length > 0) && (
        <div
          ref={viewportRef}
          className="canvas-viewport"
          onMouseDown={onViewportMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onDoubleClick={handleDoubleClick}
          onWheel={onWheel}
        >
          {/* Dot grid */}
          <div
            className="canvas-grid"
            style={{
              backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
              backgroundPosition: `${pan.x % (28 * zoom)}px ${pan.y % (28 * zoom)}px`,
            }}
          />

          {/* Notes */}
          <div
            className="canvas-nodes"
            style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          >
            {nodes.map(node => {
              const c       = NOTE_COLORS[node.color] ?? NOTE_COLORS.yellow;
              const isSel   = selectedId === node.id;
              const isEdit  = editingId  === node.id;

              return (
                <div
                  key={node.id}
                  className={`canvas-note ${isSel ? 'selected' : ''}`}
                  style={{
                    left: node.x, top: node.y, width: node.w, minHeight: node.h,
                    background: c.bg,
                    borderColor: isSel ? '#0B7B74' : c.border,
                    boxShadow: isSel
                      ? '0 0 0 2px #0B7B74, 0 6px 24px rgba(0,0,0,.14)'
                      : '0 2px 8px rgba(0,0,0,.08)',
                  }}
                  onMouseDown={ev => onNoteMouseDown(ev, node.id)}
                  onClick={ev => { ev.stopPropagation(); if (!isDragging.current) setSelectedId(node.id); }}
                  onDoubleClick={ev => {
                    ev.stopPropagation();
                    setEditingId(node.id);
                    setEditText(node.text);
                  }}
                >
                  {node.tag && (
                    <div className="canvas-note-tag" style={{ color: c.text, borderColor: c.border }}>
                      {node.tag}
                    </div>
                  )}

                  {isEdit ? (
                    <textarea
                      className="canvas-note-edit"
                      style={{ color: c.text }}
                      value={editText}
                      autoFocus
                      placeholder="Type your idea…"
                      onChange={ev => setEditText(ev.target.value)}
                      onBlur={() => saveText(node.id, editText)}
                      onKeyDown={ev => {
                        ev.stopPropagation();
                        if (ev.key === 'Escape') setEditingId(null);
                        if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) saveText(node.id, editText);
                      }}
                      onClick={ev => ev.stopPropagation()}
                      onMouseDown={ev => ev.stopPropagation()}
                    />
                  ) : (
                    <div className="canvas-note-text" style={{ color: node.text ? c.text : '#94A3B8' }}>
                      {node.text || 'Double-click to edit…'}
                    </div>
                  )}

                  {isSel && !isEdit && (
                    <div
                      className="canvas-note-toolbar"
                      onClick={ev => ev.stopPropagation()}
                      onMouseDown={ev => ev.stopPropagation()}
                    >
                      <div className="canvas-toolbar-colors">
                        {(Object.keys(NOTE_COLORS) as NoteColor[]).map(col => (
                          <button
                            key={col}
                            className={`canvas-color-dot ${node.color === col ? 'active' : ''}`}
                            style={{ background: NOTE_COLORS[col].border }}
                            onClick={() => changeColor(node.id, col)}
                            title={NOTE_COLORS[col].label}
                          />
                        ))}
                      </div>
                      <select
                        className="canvas-tag-select"
                        value={node.tag || ''}
                        onChange={ev => changeTag(node.id, ev.target.value)}
                      >
                        {NOTE_TAGS.map(t => (
                          <option key={t} value={t}>{t || '— no tag —'}</option>
                        ))}
                      </select>
                      <button className="canvas-toolbar-btn edit" onClick={() => { setEditingId(node.id); setEditText(node.text); }} title="Edit">✏️</button>
                      <button className="canvas-toolbar-btn del" onClick={() => deleteNote(node.id)} title="Delete">🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty hint */}
          {nodes.length === 0 && (
            <div className="canvas-empty-hint">
              <div className="canvas-empty-icon">🗺️</div>
              <div className="canvas-empty-text">Canvas is ready</div>
              <div className="canvas-empty-sub">Double-click anywhere to add your first idea note</div>
            </div>
          )}
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && <div className="expert-toast">{toast}</div>}
    </div>
  );
}
