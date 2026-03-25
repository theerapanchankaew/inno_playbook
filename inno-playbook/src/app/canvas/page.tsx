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
  type: 'note' | 'label' | 'connector';
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: NoteColor;
  tag?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

const NOTE_COLORS: Record<NoteColor, { bg: string; border: string; text: string }> = {
  yellow:  { bg: '#FEFCE8', border: '#FDE047', text: '#854D0E' },
  teal:    { bg: '#F0FDFA', border: '#5EEAD4', text: '#134E4A' },
  blue:    { bg: '#EFF6FF', border: '#93C5FD', text: '#1E3A5F' },
  purple:  { bg: '#FAF5FF', border: '#C4B5FD', text: '#4C1D95' },
  red:     { bg: '#FFF1F2', border: '#FCA5A5', text: '#7F1D1D' },
  green:   { bg: '#F0FDF4', border: '#86EFAC', text: '#14532D' },
};

const NOTE_TAGS = ['💡 Insight', '🎯 Opportunity', '⚠️ Risk', '✅ Action', '❓ Question', '🔗 Link', '📌 Key Point'];

const DEFAULT_W = 200;
const DEFAULT_H = 140;

// ─── Canvas Page ─────────────────────────────────────────────────────────────

export default function CanvasPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [pickerColor, setPickerColor] = useState<NoteColor>('yellow');
  const [pickerTag, setPickerTag] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });

  // Pan state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });

  // Drag state
  const isDragging = useRef(false);
  const dragId = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const unsub = useRef<(() => void) | null>(null);

  // ── Auth + org init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const localId = localStorage.getItem(`innoPB_orgId_${user.uid}`);
    if (localId) { setOrgId(localId); return; }
    getUserOrgId(user.uid).then((id) => { if (id) setOrgId(id); });
  }, [user]);

  // ── Firestore real-time ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    unsub.current?.();
    const q = query(collection(db, 'canvases', orgId, 'nodes'));
    unsub.current = onSnapshot(q, (snap) => {
      const items: CanvasNode[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CanvasNode, 'id'>),
      }));
      setNodes(items);
    });
    return () => unsub.current?.();
  }, [orgId]);

  // ── Add note ─────────────────────────────────────────────────────────────────
  const addNote = useCallback(async (e: React.MouseEvent) => {
    if (!orgId || !user) return;
    if (isDragging.current) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;

    // show color/tag picker at click position
    setPickerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setShowPicker(true);
    // Store click coords for note creation
    (window as any).__canvasClickX = rawX;
    (window as any).__canvasClickY = rawY;
  }, [orgId, user, pan, zoom]);

  const confirmAdd = useCallback(async () => {
    if (!orgId || !user) return;
    const x = (window as any).__canvasClickX ?? 200;
    const y = (window as any).__canvasClickY ?? 200;

    await addDoc(collection(db, 'canvases', orgId, 'nodes'), {
      type: 'note',
      x,
      y,
      w: DEFAULT_W,
      h: DEFAULT_H,
      text: '',
      color: pickerColor,
      tag: pickerTag,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setShowPicker(false);
    setPickerTag('');
  }, [orgId, user, pickerColor, pickerTag]);

  // ── Delete note ──────────────────────────────────────────────────────────────
  const deleteNote = useCallback(async (id: string) => {
    if (!orgId) return;
    await deleteDoc(doc(db, 'canvases', orgId, 'nodes', id));
    if (selectedId === id) setSelectedId(null);
  }, [orgId, selectedId]);

  // ── Update text ──────────────────────────────────────────────────────────────
  const saveText = useCallback(async (id: string, text: string) => {
    if (!orgId) return;
    await updateDoc(doc(db, 'canvases', orgId, 'nodes', id), {
      text,
      updatedAt: serverTimestamp(),
    });
    setEditingId(null);
  }, [orgId]);

  // ── Update position after drag ───────────────────────────────────────────────
  const savePosition = useCallback(async (id: string, x: number, y: number) => {
    if (!orgId) return;
    await updateDoc(doc(db, 'canvases', orgId, 'nodes', id), { x, y });
  }, [orgId]);

  // ── Change color ─────────────────────────────────────────────────────────────
  const changeColor = useCallback(async (id: string, color: NoteColor) => {
    if (!orgId) return;
    await updateDoc(doc(db, 'canvases', orgId, 'nodes', id), { color });
  }, [orgId]);

  // ── Mouse events for pan + drag ───────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent, nodeId?: string) => {
    if (nodeId) {
      // Start dragging a note
      e.stopPropagation();
      isDragging.current = false; // reset — will be set to true on move
      dragId.current = nodeId;
      const node = nodes.find((n) => n.id === nodeId)!;
      const rect = canvasRef.current!.getBoundingClientRect();
      dragOffset.current = {
        x: (e.clientX - rect.left - pan.x) / zoom - node.x,
        y: (e.clientY - rect.top - pan.y) / zoom - node.y,
      };
      setSelectedId(nodeId);
    } else if (e.button === 1 || e.altKey) {
      // Middle mouse or Alt+drag → pan
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panOrigin.current = { ...pan };
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragId.current !== null) {
      isDragging.current = true;
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom - dragOffset.current.x;
      const y = (e.clientY - rect.top - pan.y) / zoom - dragOffset.current.y;
      setNodes((prev) =>
        prev.map((n) => (n.id === dragId.current ? { ...n, x, y } : n)),
      );
    } else if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy });
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (dragId.current !== null) {
      const node = nodes.find((n) => n.id === dragId.current);
      if (node && isDragging.current) {
        savePosition(node.id, node.x, node.y);
      }
      dragId.current = null;
    }
    isPanning.current = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(2, Math.max(0.3, z * delta)));
  };

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
            <span className="canvas-topbar-badge">{nodes.length} nodes</span>
          )}
        </div>
        <div className="canvas-topbar-actions">
          <span className="canvas-hint">Double-click canvas to add note · Alt+drag to pan · Scroll to zoom</span>
          <div className="canvas-zoom-ctrl">
            <button className="canvas-zoom-btn" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}>−</button>
            <span className="canvas-zoom-val">{Math.round(zoom * 100)}%</span>
            <button className="canvas-zoom-btn" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>+</button>
            <button className="canvas-zoom-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>⌂</button>
          </div>
          <Link href="/dashboard" className="canvas-nav-link">📊 Dashboard</Link>
          <Link href="/experts" className="canvas-nav-link">👥 Experts</Link>
          <Link href="/" className="canvas-nav-link">← Workshop</Link>
          <UserMenu />
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="canvas-legend">
        {(Object.keys(NOTE_COLORS) as NoteColor[]).map((c) => (
          <button
            key={c}
            className={`canvas-legend-swatch ${pickerColor === c ? 'selected' : ''}`}
            style={{ background: NOTE_COLORS[c].bg, border: `2px solid ${NOTE_COLORS[c].border}`, color: NOTE_COLORS[c].text }}
            onClick={() => setPickerColor(c)}
            title={c}
          >
            {c}
          </button>
        ))}
        <div className="canvas-legend-divider" />
        <span className="canvas-legend-tip">Selected color for new notes</span>
      </div>

      {/* ── Main canvas area ─────────────────────────────────────────────────── */}
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
          ref={canvasRef}
          className="canvas-viewport"
          onMouseDown={(e) => onMouseDown(e)}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onDoubleClick={addNote}
          onWheel={onWheel}
        >
          {/* Grid background */}
          <div
            className="canvas-grid"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          />

          {/* Nodes */}
          <div
            className="canvas-nodes"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          >
            {nodes.map((node) => {
              const colors = NOTE_COLORS[node.color] ?? NOTE_COLORS.yellow;
              const isSelected = selectedId === node.id;
              const isEditing = editingId === node.id;

              return (
                <div
                  key={node.id}
                  className={`canvas-note ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.w,
                    minHeight: node.h,
                    background: colors.bg,
                    borderColor: isSelected ? '#0B7B74' : colors.border,
                    boxShadow: isSelected
                      ? `0 0 0 2px #0B7B74, 0 4px 20px rgba(0,0,0,.12)`
                      : `0 2px 8px rgba(0,0,0,.08)`,
                  }}
                  onMouseDown={(e) => onMouseDown(e, node.id)}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(node.id);
                    setEditText(node.text);
                  }}
                >
                  {/* Tag */}
                  {node.tag && (
                    <div className="canvas-note-tag" style={{ color: colors.text, borderColor: colors.border }}>
                      {node.tag}
                    </div>
                  )}

                  {/* Content */}
                  {isEditing ? (
                    <textarea
                      className="canvas-note-edit"
                      style={{ color: colors.text }}
                      value={editText}
                      autoFocus
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => saveText(node.id, editText)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingId(null);
                        if (e.key === 'Enter' && e.metaKey) saveText(node.id, editText);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="canvas-note-text"
                      style={{ color: node.text ? colors.text : '#94A3B8' }}
                    >
                      {node.text || 'Double-click to edit...'}
                    </div>
                  )}

                  {/* Actions (visible on select) */}
                  {isSelected && !isEditing && (
                    <div className="canvas-note-actions">
                      {(Object.keys(NOTE_COLORS) as NoteColor[]).map((c) => (
                        <button
                          key={c}
                          className="canvas-note-color-dot"
                          style={{ background: NOTE_COLORS[c].border }}
                          onClick={(e) => { e.stopPropagation(); changeColor(node.id, c); }}
                          title={c}
                        />
                      ))}
                      <button
                        className="canvas-note-del"
                        onClick={(e) => { e.stopPropagation(); deleteNote(node.id); }}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="canvas-empty-hint">
              <div className="canvas-empty-icon">🗺️</div>
              <div className="canvas-empty-text">Your canvas is empty</div>
              <div className="canvas-empty-sub">Double-click anywhere to add your first idea note</div>
            </div>
          )}
        </div>
      )}

      {/* ── Color/Tag picker modal ───────────────────────────────────────────── */}
      {showPicker && (
        <div
          className="canvas-picker"
          style={{ left: pickerPos.x, top: pickerPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="canvas-picker-title">New Note</div>
          <div className="canvas-picker-colors">
            {(Object.keys(NOTE_COLORS) as NoteColor[]).map((c) => (
              <button
                key={c}
                className={`canvas-picker-swatch ${pickerColor === c ? 'active' : ''}`}
                style={{ background: NOTE_COLORS[c].bg, border: `2px solid ${NOTE_COLORS[c].border}` }}
                onClick={() => setPickerColor(c)}
                title={c}
              />
            ))}
          </div>
          <div className="canvas-picker-tags">
            {NOTE_TAGS.map((t) => (
              <button
                key={t}
                className={`canvas-picker-tag ${pickerTag === t ? 'active' : ''}`}
                onClick={() => setPickerTag(pickerTag === t ? '' : t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="canvas-picker-foot">
            <button className="canvas-picker-cancel" onClick={() => setShowPicker(false)}>Cancel</button>
            <button className="canvas-picker-confirm" onClick={confirmAdd}>Add Note</button>
          </div>
        </div>
      )}
    </div>
  );
}
