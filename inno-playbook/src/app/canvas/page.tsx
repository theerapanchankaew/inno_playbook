'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { getUserOrgId } from '@/lib/authActions';
import UserMenu from '@/components/UserMenu';

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
  createdAt: any;
  updatedAt: any;
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

const DEFAULT_W = 200;
const DEFAULT_H = 130;

// ─── Canvas Page ─────────────────────────────────────────────────────────────

export default function CanvasPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orgId, setOrgId]       = useState<string | null>(null);
  const [nodes, setNodes]       = useState<CanvasNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editText, setEditText]     = useState('');
  const [activeColor, setActiveColor] = useState<NoteColor>('yellow');

  // pan / zoom
  const [pan,  setPan]  = useState({ x: 60, y: 60 });
  const [zoom, setZoom] = useState(1);
  const panRef    = useRef(pan);
  const zoomRef   = useRef(zoom);
  useEffect(() => { panRef.current = pan; },  [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // drag refs (mutable, no re-render needed)
  const isDragging  = useRef(false);
  const dragId      = useRef<string | null>(null);
  const dragStart   = useRef({ mx: 0, my: 0, nx: 0, ny: 0 }); // mouse + node start pos

  // pan refs
  const isPanning   = useRef(false);
  const panStart    = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);
  const unsubRef    = useRef<(() => void) | null>(null);

  // ── Auth ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const cached = localStorage.getItem(`innoPB_orgId_${user.uid}`);
    if (cached) { setOrgId(cached); return; }
    getUserOrgId(user.uid).then((id) => { if (id) setOrgId(id); });
  }, [user]);

  // ── Firestore realtime ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    unsubRef.current?.();
    const q = query(collection(db, 'canvases', orgId, 'nodes'));
    unsubRef.current = onSnapshot(q, (snap) => {
      setNodes(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CanvasNode, 'id'>) })),
      );
    });
    return () => unsubRef.current?.();
  }, [orgId]);

  // ── Add note — double-click on empty canvas ───────────────────────────────────
  const handleDoubleClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      // Ignore if we just finished dragging
      if (isDragging.current) return;
      if (!orgId || !user) return;

      const rect = viewportRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
      const y = (e.clientY - rect.top  - panRef.current.y) / zoomRef.current;

      const ref = await addDoc(collection(db, 'canvases', orgId, 'nodes'), {
        x,
        y,
        w: DEFAULT_W,
        h: DEFAULT_H,
        text: '',
        color: activeColor,
        tag: '',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Auto-open editing on the new note
      setSelectedId(ref.id);
      setEditingId(ref.id);
      setEditText('');
    },
    [orgId, user, activeColor],
  );

  // ── Delete note ───────────────────────────────────────────────────────────────
  const deleteNote = useCallback(
    async (id: string) => {
      if (!orgId) return;
      await deleteDoc(doc(db, 'canvases', orgId, 'nodes', id));
      setSelectedId((s) => (s === id ? null : s));
      setEditingId((e) => (e === id ? null : e));
    },
    [orgId],
  );

  // ── Save text ─────────────────────────────────────────────────────────────────
  const saveText = useCallback(
    async (id: string, text: string) => {
      if (!orgId) return;
      await updateDoc(doc(db, 'canvases', orgId, 'nodes', id), {
        text,
        updatedAt: serverTimestamp(),
      });
      setEditingId(null);
    },
    [orgId],
  );

  // ── Change color ──────────────────────────────────────────────────────────────
  const changeColor = useCallback(
    async (id: string, color: NoteColor) => {
      if (!orgId) return;
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)));
      await updateDoc(doc(db, 'canvases', orgId, 'nodes', id), { color });
    },
    [orgId],
  );

  // ── Change tag ────────────────────────────────────────────────────────────────
  const changeTag = useCallback(
    async (id: string, tag: string) => {
      if (!orgId) return;
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, tag } : n)));
      await updateDoc(doc(db, 'canvases', orgId, 'nodes', id), { tag });
    },
    [orgId],
  );

  // ── Mouse down ────────────────────────────────────────────────────────────────
  const onViewportMouseDown = (e: React.MouseEvent) => {
    // Always reset drag state on any mousedown on the viewport
    isDragging.current = false;
    dragId.current = null;

    if (e.button === 1 || e.altKey) {
      // Pan mode: middle-click or Alt + left-drag
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { mx: e.clientX, my: e.clientY, px: panRef.current.x, py: panRef.current.y };
    } else {
      // Deselect when clicking empty canvas
      setSelectedId(null);
    }
  };

  const onNoteMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    isDragging.current = false;
    dragId.current = nodeId;
    const node = nodes.find((n) => n.id === nodeId)!;
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      nx: node.x,
      ny: node.y,
    };
    setSelectedId(nodeId);
  };

  // ── Mouse move ────────────────────────────────────────────────────────────────
  const onMouseMove = (e: React.MouseEvent) => {
    if (dragId.current !== null) {
      const dx = (e.clientX - dragStart.current.mx) / zoomRef.current;
      const dy = (e.clientY - dragStart.current.my) / zoomRef.current;

      if (!isDragging.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDragging.current = true;
      }

      if (isDragging.current) {
        const newX = dragStart.current.nx + dx;
        const newY = dragStart.current.ny + dy;
        setNodes((prev) =>
          prev.map((n) => (n.id === dragId.current ? { ...n, x: newX, y: newY } : n)),
        );
      }
    } else if (isPanning.current) {
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.mx),
        y: panStart.current.py + (e.clientY - panStart.current.my),
      });
    }
  };

  // ── Mouse up ──────────────────────────────────────────────────────────────────
  const onMouseUp = (e: React.MouseEvent) => {
    if (dragId.current !== null && isDragging.current) {
      // Persist final position
      const node = nodes.find((n) => n.id === dragId.current);
      if (node && orgId) {
        updateDoc(doc(db, 'canvases', orgId, 'nodes', node.id), { x: node.x, y: node.y }).catch(() => {});
      }
    }
    // Always reset — this is the key fix
    isDragging.current = false;
    dragId.current = null;
    isPanning.current = false;
  };

  // ── Wheel zoom ────────────────────────────────────────────────────────────────
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2.5, Math.max(0.25, z * (e.deltaY > 0 ? 0.92 : 1.09))));
  };

  // ── Loading screen ────────────────────────────────────────────────────────────
  if (authLoading || !profile) {
    return (
      <div className="canvas-loading">
        <span className="logo-badge">MASCI · ISO 56001</span>
        <div style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 12, marginTop: 12 }}>
          Loading Canvas...
        </div>
      </div>
    );
  }

  const selectedNode = nodes.find((n) => n.id === selectedId);

  return (
    <div className="canvas-page">

      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <div className="canvas-topbar">
        <div className="canvas-topbar-left">
          <span className="logo-badge">MASCI · ISO 56001</span>
          <span className="canvas-topbar-title">🗺️ Innovation Canvas</span>
          {orgId && (
            <span className="canvas-topbar-badge">{nodes.length} notes</span>
          )}
        </div>
        <div className="canvas-topbar-actions">
          <span className="canvas-hint">Double-click to add · Drag to move · Alt+drag or middle-click to pan · Scroll to zoom</span>
          <div className="canvas-zoom-ctrl">
            <button className="canvas-zoom-btn" onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}>−</button>
            <span className="canvas-zoom-val">{Math.round(zoom * 100)}%</span>
            <button className="canvas-zoom-btn" onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}>+</button>
            <button className="canvas-zoom-btn" title="Reset view" onClick={() => { setZoom(1); setPan({ x: 60, y: 60 }); }}>⌂</button>
          </div>
          <Link href="/dashboard" className="canvas-nav-link">📊 Dashboard</Link>
          <Link href="/experts"   className="canvas-nav-link">👥 Experts</Link>
          <Link href="/"          className="canvas-nav-link">← Workshop</Link>
          <UserMenu />
        </div>
      </div>

      {/* ── Color palette (top legend) ───────────────────────────────────────── */}
      <div className="canvas-legend">
        <span className="canvas-legend-tip">Note color:</span>
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
          Double-click on canvas to add a note
        </span>
      </div>

      {/* ── Canvas or empty-org message ──────────────────────────────────────── */}
      {!orgId ? (
        <div className="canvas-empty-org">
          <div style={{ fontSize: 48 }}>🗺️</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--navy)' }}>No organization linked</div>
          <div style={{ color: 'var(--muted)', marginTop: 8 }}>
            Go to the <Link href="/" style={{ color: 'var(--teal)' }}>Workshop</Link> first to set up your organization.
          </div>
        </div>
      ) : (
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
          {/* Dot-grid background */}
          <div
            className="canvas-grid"
            style={{
              transform: `translate(${pan.x % 28}px, ${pan.y % 28}px)`,
              backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
            }}
          />

          {/* Notes layer */}
          <div
            className="canvas-nodes"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          >
            {nodes.map((node) => {
              const colors   = NOTE_COLORS[node.color] ?? NOTE_COLORS.yellow;
              const isSel    = selectedId === node.id;
              const isEditing = editingId === node.id;

              return (
                <div
                  key={node.id}
                  className={`canvas-note ${isSel ? 'selected' : ''}`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.w,
                    minHeight: node.h,
                    background: colors.bg,
                    borderColor: isSel ? '#0B7B74' : colors.border,
                    boxShadow: isSel
                      ? '0 0 0 2px #0B7B74, 0 6px 24px rgba(0,0,0,.14)'
                      : '0 2px 8px rgba(0,0,0,.08)',
                  }}
                  onMouseDown={(e) => onNoteMouseDown(e, node.id)}
                  onClick={(e) => { e.stopPropagation(); if (!isDragging.current) setSelectedId(node.id); }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(node.id);
                    setEditText(node.text);
                  }}
                >
                  {/* Tag badge */}
                  {node.tag && (
                    <div className="canvas-note-tag" style={{ color: colors.text, borderColor: colors.border }}>
                      {node.tag}
                    </div>
                  )}

                  {/* Text area / display */}
                  {isEditing ? (
                    <textarea
                      className="canvas-note-edit"
                      style={{ color: colors.text }}
                      value={editText}
                      autoFocus
                      placeholder="Type your idea..."
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => saveText(node.id, editText)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Escape') { setEditingId(null); }
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveText(node.id, editText);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="canvas-note-text"
                      style={{ color: node.text ? colors.text : '#94A3B8' }}
                    >
                      {node.text || 'Double-click to edit…'}
                    </div>
                  )}

                  {/* Toolbar (visible when selected, not editing) */}
                  {isSel && !isEditing && (
                    <div className="canvas-note-toolbar" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      {/* Color dots */}
                      <div className="canvas-toolbar-colors">
                        {(Object.keys(NOTE_COLORS) as NoteColor[]).map((c) => (
                          <button
                            key={c}
                            className={`canvas-color-dot ${node.color === c ? 'active' : ''}`}
                            style={{ background: NOTE_COLORS[c].border }}
                            onClick={() => changeColor(node.id, c)}
                            title={NOTE_COLORS[c].label}
                          />
                        ))}
                      </div>

                      {/* Tag selector */}
                      <select
                        className="canvas-tag-select"
                        value={node.tag || ''}
                        onChange={(e) => changeTag(node.id, e.target.value)}
                      >
                        {NOTE_TAGS.map((t) => (
                          <option key={t} value={t}>{t || '— no tag —'}</option>
                        ))}
                      </select>

                      {/* Edit / Delete */}
                      <button
                        className="canvas-toolbar-btn edit"
                        onClick={() => { setEditingId(node.id); setEditText(node.text); }}
                        title="Edit"
                      >✏️</button>
                      <button
                        className="canvas-toolbar-btn del"
                        onClick={() => deleteNote(node.id)}
                        title="Delete"
                      >🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty-canvas hint */}
          {nodes.length === 0 && (
            <div className="canvas-empty-hint">
              <div className="canvas-empty-icon">🗺️</div>
              <div className="canvas-empty-text">Your canvas is empty</div>
              <div className="canvas-empty-sub">Double-click anywhere to add your first idea note</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
