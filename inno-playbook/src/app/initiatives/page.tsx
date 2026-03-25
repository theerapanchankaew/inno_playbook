'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Initiative,
  InitiativeStatus,
  InitiativePriority,
  InitiativeType,
  STATUS_META,
  PRIORITY_META,
  TYPE_META,
  subscribeToInitiatives,
  deleteInitiative,
  updateInitiativeStatus,
  updateInitiativeProgress,
  toggleMilestone,
} from '@/lib/initiativeActions';
import { getUserOrgId, linkOrgToUser } from '@/lib/authActions';
import { saveOrganization, getOrganizationData } from '@/lib/actions';
import InitiativeModal from '@/components/InitiativeModal';
import Topbar from '@/components/Topbar';
import GlobalNav from '@/components/GlobalNav';

// ─── Org Setup Modal — แสดงเมื่อ user ยังไม่มี Organization ──────────────────

function OrgSetupModal({
  onComplete,
}: {
  onComplete: (orgId: string, name: string, sector: string) => void;
}) {
  const [name,    setName]    = useState('');
  const [sector,  setSector]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const { user } = useAuth();

  const SECTORS = [
    'ภาครัฐ / Government', 'การศึกษา / Education', 'สาธารณสุข / Healthcare',
    'การเงิน / Finance', 'เทคโนโลยี / Technology', 'การผลิต / Manufacturing',
    'การค้าปลีก / Retail', 'พลังงาน / Energy', 'การเกษตร / Agriculture', 'อื่นๆ / Other',
  ];

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    const org = await saveOrganization(null, name.trim(), sector);
    if (org) {
      await linkOrgToUser(user.uid, org.id);
      localStorage.setItem(`innoPB_orgId_${user.uid}`, org.id);
      onComplete(org.id, name.trim(), sector);
    }
    setSaving(false);
  };

  return (
    <div className="org-setup-overlay">
      <div className="org-setup-modal">
        <div className="org-setup-icon">🏢</div>
        <div className="org-setup-title">ตั้งค่าองค์กรของคุณ</div>
        <div className="org-setup-sub">
          กรอกข้อมูลองค์กรเพื่อเริ่มต้นใช้งาน Innovation Playbook Platform
        </div>

        <div className="org-setup-fields">
          <label className="org-setup-label">ชื่อองค์กร *</label>
          <input
            className="org-setup-input"
            placeholder="เช่น บริษัท ABC จำกัด"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />

          <label className="org-setup-label" style={{ marginTop: 14 }}>ประเภทธุรกิจ / Sector</label>
          <select
            className="org-setup-select"
            value={sector}
            onChange={e => setSector(e.target.value)}
          >
            <option value="">-- เลือก Sector --</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <button
          className="org-setup-btn"
          onClick={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? '⏳ กำลังบันทึก...' : '🚀 เริ่มต้นใช้งาน'}
        </button>
      </div>
    </div>
  );
}

// ─── View modes ───────────────────────────────────────────────────────────────
type ViewMode = 'board' | 'list' | 'grid';

const BOARD_COLS: { status: InitiativeStatus; label: string; emoji: string }[] = [
  { status: 'draft',    label: 'Draft',    emoji: '📝' },
  { status: 'active',   label: 'Active',   emoji: '🚀' },
  { status: 'review',   label: 'Review',   emoji: '🔍' },
  { status: 'approved', label: 'Approved', emoji: '✅' },
  { status: 'archived', label: 'Archived', emoji: '📦' },
];

// ─── Helper: days until target ────────────────────────────────────────────────
function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatBudget(n?: number): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `฿${(n / 1_000).toFixed(0)}K`;
  return `฿${n}`;
}

// ─── InitiativeCard ───────────────────────────────────────────────────────────
function InitiativeCard({
  item,
  onEdit,
  onDelete,
  onStatusChange,
  compact = false,
}: {
  item: Initiative;
  onEdit: (i: Initiative) => void;
  onDelete: (i: Initiative) => void;
  onStatusChange?: (id: string, s: InitiativeStatus) => void;
  compact?: boolean;
}) {
  const sm = STATUS_META[item.status];
  const pm = PRIORITY_META[item.priority];
  const tm = TYPE_META[item.type];
  const days = daysUntil(item.targetDate);
  const overdue = days !== null && days < 0;
  const soon    = days !== null && days >= 0 && days <= 7;
  const completedMS = item.milestones?.filter(m => m.completed).length ?? 0;
  const totalMS     = item.milestones?.length ?? 0;

  return (
    <div className={`init-card ${compact ? 'compact' : ''}`}>
      {/* Top row */}
      <div className="init-card-top">
        <span className="init-type-badge">{tm.emoji} {tm.label}</span>
        <div className="init-card-badges">
          <span className="init-priority-badge" style={{ background: pm.bg, color: pm.color }}>{pm.label}</span>
          <span className="init-status-badge"  style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
        </div>
      </div>

      {/* Title */}
      <div className="init-card-title">{item.title || '(ไม่มีชื่อ)'}</div>

      {!compact && item.description && (
        <div className="init-card-desc">{item.description}</div>
      )}

      {/* Progress bar */}
      <div className="init-card-progress-wrap">
        <div className="init-card-progress-bar" style={{ width: `${item.overallProgress}%` }} />
      </div>
      <div className="init-card-progress-row">
        <span className="init-card-progress-label">Progress</span>
        <span className="init-card-progress-pct">{item.overallProgress}%</span>
      </div>

      {/* Meta row */}
      <div className="init-card-meta">
        {item.linkedCapId && (
          <span className="init-card-cap">🗺 {item.linkedCapId}</span>
        )}
        {item.targetDate && (
          <span className={`init-card-date ${overdue ? 'overdue' : soon ? 'soon' : ''}`}>
            {overdue ? '⚠️' : '📅'}{' '}
            {overdue ? `เลยกำหนด ${Math.abs(days!)} วัน` : days === 0 ? 'วันนี้!' : `${days} วัน`}
          </span>
        )}
        {totalMS > 0 && (
          <span className="init-card-ms">🏁 {completedMS}/{totalMS}</span>
        )}
        {item.budget && (
          <span className="init-card-budget">💰 {formatBudget(item.budget)}</span>
        )}
      </div>

      {/* Tags */}
      {!compact && item.tags?.length > 0 && (
        <div className="init-card-tags">
          {item.tags.slice(0, 4).map(t => (
            <span key={t} className="init-card-tag">{t}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="init-card-actions">
        {onStatusChange && item.status !== 'archived' && (
          <select
            className="init-card-status-sel"
            value={item.status}
            onChange={e => onStatusChange(item.id, e.target.value as InitiativeStatus)}
            onClick={e => e.stopPropagation()}
          >
            {(Object.keys(STATUS_META) as InitiativeStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        )}
        <a
          className="init-card-workspace-btn"
          href={`/initiatives/${item.id}`}
          onClick={e => e.stopPropagation()}
        >
          🗺 Workspace
        </a>
        <button className="init-card-edit-btn" onClick={() => onEdit(item)}>✏️</button>
        <button className="init-card-del-btn"  onClick={() => onDelete(item)}>🗑</button>
      </div>
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────
function InitiativeDetail({
  item,
  onClose,
  onEdit,
  onToggleMilestone,
}: {
  item: Initiative;
  onClose: () => void;
  onEdit: () => void;
  onToggleMilestone: (msId: string) => void;
}) {
  const sm = STATUS_META[item.status];
  const pm = PRIORITY_META[item.priority];
  const tm = TYPE_META[item.type];
  const completedMS = item.milestones?.filter(m => m.completed).length ?? 0;
  const totalMS     = item.milestones?.length ?? 0;

  return (
    <div className="init-detail-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="init-detail-panel">
        <div className="init-detail-hdr">
          <div>
            <div className="init-detail-title">{item.title}</div>
            <div className="init-detail-sub">
              <span className="init-type-badge">{tm.emoji} {tm.label}</span>
              <span className="init-priority-badge" style={{ background: pm.bg, color: pm.color }}>{pm.label}</span>
              <span className="init-status-badge"  style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
            </div>
          </div>
          <div className="init-detail-hdr-actions">
            <button className="init-card-edit-btn" onClick={onEdit}>✏️ แก้ไข</button>
            <button className="init-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="init-detail-body">
          {item.description && (
            <div className="init-detail-section">
              <div className="init-detail-section-label">📋 รายละเอียด</div>
              <p className="init-detail-desc">{item.description}</p>
            </div>
          )}

          {/* Progress */}
          <div className="init-detail-section">
            <div className="init-detail-section-label">📈 ความคืบหน้า</div>
            <div className="init-detail-progress-wrap">
              <div className="init-detail-progress-bar" style={{ width: `${item.overallProgress}%` }} />
            </div>
            <div className="init-detail-progress-pct">{item.overallProgress}%</div>
          </div>

          {/* Meta grid */}
          <div className="init-detail-meta-grid">
            {item.targetDate && (
              <div className="init-detail-meta-item">
                <div className="init-detail-meta-label">Target Date</div>
                <div className="init-detail-meta-val">📅 {item.targetDate}</div>
              </div>
            )}
            {item.budget && (
              <div className="init-detail-meta-item">
                <div className="init-detail-meta-label">Budget</div>
                <div className="init-detail-meta-val">💰 {formatBudget(item.budget)}</div>
              </div>
            )}
            {item.linkedCapId && (
              <div className="init-detail-meta-item">
                <div className="init-detail-meta-label">Linked CAP</div>
                <div className="init-detail-meta-val">🗺 {item.linkedCapId}</div>
              </div>
            )}
            <div className="init-detail-meta-item">
              <div className="init-detail-meta-label">Owner</div>
              <div className="init-detail-meta-val">👤 {item.ownerName}</div>
            </div>
          </div>

          {/* KPIs */}
          {item.kpis?.filter(k => k.name).length > 0 && (
            <div className="init-detail-section">
              <div className="init-detail-section-label">📊 KPI Targets</div>
              <div className="init-detail-kpis">
                {item.kpis.filter(k => k.name).map((kpi, i) => (
                  <div key={i} className="init-detail-kpi-row">
                    <div className="init-detail-kpi-name">{kpi.name}</div>
                    <div className="init-detail-kpi-vals">
                      <span className="init-detail-kpi-target">Target: {kpi.target}</span>
                      {kpi.current && <span className="init-detail-kpi-current">Now: {kpi.current}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestones */}
          {totalMS > 0 && (
            <div className="init-detail-section">
              <div className="init-detail-section-label">🏁 Milestones ({completedMS}/{totalMS})</div>
              <div className="init-detail-ms-list">
                {item.milestones.map(ms => (
                  <div key={ms.id} className={`init-detail-ms-item ${ms.completed ? 'done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={ms.completed}
                      onChange={() => onToggleMilestone(ms.id)}
                      className="init-ms-check"
                    />
                    <span className="init-detail-ms-title">{ms.title}</span>
                    {ms.dueDate && <span className="init-detail-ms-date">📅 {ms.dueDate}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {item.tags?.length > 0 && (
            <div className="init-detail-section">
              <div className="init-detail-section-label">🏷 Tags</div>
              <div className="init-card-tags">
                {item.tags.map(t => <span key={t} className="init-card-tag">{t}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InitiativesPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orgId,        setOrgId]        = useState<string | null>(null);
  const [orgName,      setOrgName]      = useState('');
  const [orgSector,    setOrgSector]    = useState('');
  const [showOrgSetup, setShowOrgSetup] = useState(false);
  const [items,        setItems]        = useState<Initiative[]>([]);
  const [viewMode,     setViewMode]     = useState<ViewMode>('board');
  const [showModal,    setShowModal]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<Initiative | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Initiative | null>(null);
  const [detailItem,   setDetailItem]   = useState<Initiative | null>(null);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<InitiativeStatus | 'all'>('all');
  const [filterType,   setFilterType]   = useState<InitiativeType | 'all'>('all');
  const [sortBy,       setSortBy]       = useState<'createdAt' | 'targetDate' | 'priority' | 'progress'>('createdAt');
  const [loading,      setLoading]      = useState(true);
  const [deleting,     setDeleting]     = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  // Load orgId — super_admin ใช้ uid เป็น fallback; ผู้ใช้ทั่วไปที่ยังไม่มี org → แสดง setup modal
  useEffect(() => {
    if (!user || authLoading) return;
    const local = localStorage.getItem(`innoPB_orgId_${user.uid}`);
    if (local) { setOrgId(local); return; }
    getUserOrgId(user.uid).then(id => {
      if (id) {
        setOrgId(id);
      } else if (profile?.role === 'super_admin') {
        // super_admin ไม่ต้องมี org — ใช้ uid เป็น namespace สำหรับ initiative ของตัวเอง
        setOrgId(user.uid);
      } else {
        // ผู้ใช้ทั่วไปที่ยังไม่ได้ตั้งค่า org → แสดง modal
        setShowOrgSetup(true);
        setLoading(false);
      }
    });
  }, [user, authLoading, profile?.role]);

  // Load org name for exports
  useEffect(() => {
    if (!orgId) return;
    getOrganizationData(orgId).then(org => {
      if (org) { setOrgName(org.name); setOrgSector(org.sector || ''); }
    });
  }, [orgId]);

  // Subscribe to initiatives
  useEffect(() => {
    if (!orgId || !user) return;
    setLoading(true);
    // super_admin: subscribe all orgs via orgId = uid (namespace ตัวเอง)
    // หรือถ้า orgId ผูกกับ org จริง ก็ subscribe org นั้น
    const unsub = subscribeToInitiatives(orgId, items => {
      setItems(items);
      setLoading(false);
    });
    return unsub;
  }, [orgId, user]);

  // Filtered + sorted items
  const filtered = useMemo(() => {
    let list = items.filter(it => {
      const matchSearch = !search ||
        it.title.toLowerCase().includes(search.toLowerCase()) ||
        it.description?.toLowerCase().includes(search.toLowerCase()) ||
        it.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = filterStatus === 'all' || it.status === filterStatus;
      const matchType   = filterType   === 'all' || it.type   === filterType;
      return matchSearch && matchStatus && matchType;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'targetDate') {
        return (a.targetDate || '9999').localeCompare(b.targetDate || '9999');
      }
      if (sortBy === 'priority') {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      }
      if (sortBy === 'progress') return b.overallProgress - a.overallProgress;
      // createdAt desc (default — already ordered by Firestore)
      return 0;
    });

    return list;
  }, [items, search, filterStatus, filterType, sortBy]);

  // Stats
  const stats = useMemo(() => ({
    total:    items.length,
    active:   items.filter(i => i.status === 'active').length,
    approved: items.filter(i => i.status === 'approved').length,
    avgProgress: items.length
      ? Math.round(items.reduce((s, i) => s + i.overallProgress, 0) / items.length)
      : 0,
  }), [items]);

  const handleEdit   = (i: Initiative) => { setEditTarget(i); setShowModal(true); };
  const handleCreate = () => { setEditTarget(null); setShowModal(true); };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteInitiative(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  };
  const handleStatusChange = (id: string, s: InitiativeStatus) => updateInitiativeStatus(id, s);
  const handleToggleMS = async (item: Initiative, msId: string) => {
    await toggleMilestone(item.id, msId, item.milestones);
    if (detailItem?.id === item.id) {
      setDetailItem(items.find(i => i.id === item.id) ?? null);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="layout-root gnav-offset">
      <GlobalNav />
      <Topbar
        orgName={orgName || 'Innovation Initiatives'}
        orgSector={orgSector}
      />

      <div className="init-page">
        {/* ── Page header ── */}
        <div className="init-page-hdr">
          <div className="init-page-hdr-left">
            <div className="init-page-title">🚀 Innovation Initiatives</div>
            <div className="init-page-sub">จัดการ Innovation Projects ทั้งหมดขององค์กร</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/community" className="init-community-btn">
              💡 Community Space
            </Link>
            <button className="init-create-btn" onClick={handleCreate}>
              ➕ สร้าง Initiative ใหม่
            </button>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="init-stats-bar">
          <div className="init-stat-card">
            <div className="init-stat-num">{stats.total}</div>
            <div className="init-stat-label">Total</div>
          </div>
          <div className="init-stat-card active">
            <div className="init-stat-num">{stats.active}</div>
            <div className="init-stat-label">Active</div>
          </div>
          <div className="init-stat-card approved">
            <div className="init-stat-num">{stats.approved}</div>
            <div className="init-stat-label">Approved</div>
          </div>
          <div className="init-stat-card progress">
            <div className="init-stat-num">{stats.avgProgress}%</div>
            <div className="init-stat-label">Avg Progress</div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="init-toolbar">
          <div className="init-toolbar-left">
            <input
              className="init-search"
              placeholder="🔍 ค้นหา initiative, tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="init-filter-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value as InitiativeStatus | 'all')}>
              <option value="all">All Status</option>
              {(Object.keys(STATUS_META) as InitiativeStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
            <select className="init-filter-sel" value={filterType} onChange={e => setFilterType(e.target.value as InitiativeType | 'all')}>
              <option value="all">All Types</option>
              {(Object.keys(TYPE_META) as InitiativeType[]).map(t => (
                <option key={t} value={t}>{TYPE_META[t].emoji} {TYPE_META[t].label}</option>
              ))}
            </select>
            <select className="init-filter-sel" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
              <option value="createdAt">Sort: วันที่สร้าง</option>
              <option value="targetDate">Sort: Target Date</option>
              <option value="priority">Sort: Priority</option>
              <option value="progress">Sort: Progress</option>
            </select>
          </div>

          <div className="init-view-toggle">
            <button className={`init-view-btn ${viewMode === 'board' ? 'active' : ''}`} onClick={() => setViewMode('board')}>⬛ Board</button>
            <button className={`init-view-btn ${viewMode === 'grid'  ? 'active' : ''}`} onClick={() => setViewMode('grid')}>⊞ Grid</button>
            <button className={`init-view-btn ${viewMode === 'list'  ? 'active' : ''}`} onClick={() => setViewMode('list')}>☰ List</button>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="init-loading">⏳ กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div className="init-empty">
            <div className="init-empty-icon">🚀</div>
            <div className="init-empty-title">
              {items.length === 0 ? 'ยังไม่มี Initiative' : 'ไม่พบ Initiative ที่ตรงกับเงื่อนไข'}
            </div>
            <div className="init-empty-sub">
              {items.length === 0
                ? 'เริ่มต้นสร้าง Innovation Initiative แรกขององค์กรของคุณ'
                : 'ลองปรับ filter หรือคำค้นหา'}
            </div>
            {items.length === 0 && (
              <button className="init-create-btn" onClick={handleCreate}>➕ สร้าง Initiative แรก</button>
            )}
          </div>
        ) : (

          /* ── BOARD VIEW ── */
          viewMode === 'board' ? (
            <div className="init-board">
              {BOARD_COLS.map(col => {
                const colItems = filtered.filter(i => i.status === col.status);
                return (
                  <div key={col.status} className="init-board-col">
                    <div className="init-board-col-hdr">
                      <span>{col.emoji} {col.label}</span>
                      <span className="init-board-col-count">{colItems.length}</span>
                    </div>
                    <div className="init-board-col-body">
                      {colItems.map(item => (
                        <div key={item.id} className="init-board-card-wrap" onClick={() => setDetailItem(item)}>
                          <InitiativeCard
                            item={item}
                            compact
                            onEdit={i => { setDetailItem(null); handleEdit(i); }}
                            onDelete={i => setDeleteTarget(i)}
                            onStatusChange={handleStatusChange}
                          />
                        </div>
                      ))}
                      {colItems.length === 0 && (
                        <div className="init-board-empty">ไม่มี initiative</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          /* ── GRID VIEW ── */
          ) : viewMode === 'grid' ? (
            <div className="init-grid">
              {filtered.map(item => (
                <InitiativeCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={i => setDeleteTarget(i)}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>

          /* ── LIST VIEW ── */
          ) : (
            <div className="init-list">
              <div className="init-list-hdr">
                <span style={{flex:3}}>Initiative</span>
                <span style={{flex:1}}>Type</span>
                <span style={{flex:1}}>Priority</span>
                <span style={{flex:1}}>Status</span>
                <span style={{flex:1}}>Progress</span>
                <span style={{flex:1}}>Target</span>
                <span style={{width:80}}>Actions</span>
              </div>
              {filtered.map(item => {
                const sm = STATUS_META[item.status];
                const pm = PRIORITY_META[item.priority];
                const tm = TYPE_META[item.type];
                const days = daysUntil(item.targetDate);
                const overdue = days !== null && days < 0;
                return (
                  <div key={item.id} className="init-list-row" onClick={() => setDetailItem(item)}>
                    <div style={{flex:3,minWidth:0}}>
                      <div className="init-list-title">{item.title}</div>
                      {item.tags?.length > 0 && (
                        <div className="init-card-tags" style={{marginTop:3}}>
                          {item.tags.slice(0,3).map(t => <span key={t} className="init-card-tag">{t}</span>)}
                        </div>
                      )}
                    </div>
                    <span style={{flex:1,fontSize:11}}>{tm.emoji} {tm.label}</span>
                    <span style={{flex:1}}>
                      <span className="init-priority-badge" style={{background:pm.bg,color:pm.color}}>{pm.label}</span>
                    </span>
                    <span style={{flex:1}}>
                      <span className="init-status-badge" style={{background:sm.bg,color:sm.color}}>{sm.label}</span>
                    </span>
                    <span style={{flex:1}}>
                      <div className="init-list-progress-wrap">
                        <div className="init-list-progress-bar" style={{width:`${item.overallProgress}%`}}/>
                      </div>
                      <span style={{fontSize:10,color:'#64748B'}}>{item.overallProgress}%</span>
                    </span>
                    <span style={{flex:1,fontSize:11,color: overdue ? '#DC2626' : '#64748B'}}>
                      {item.targetDate || '—'}
                    </span>
                    <span style={{width:110,display:'flex',gap:4}} onClick={e => e.stopPropagation()}>
                      <a className="init-card-workspace-btn" href={`/initiatives/${item.id}`} style={{padding:'4px 8px',fontSize:10}}>🗺</a>
                      <button className="init-card-edit-btn" style={{padding:'4px 8px',fontSize:11}} onClick={() => handleEdit(item)}>✏️</button>
                      <button className="init-card-del-btn"  style={{padding:'4px 8px',fontSize:11}} onClick={() => setDeleteTarget(item)}>🗑</button>
                    </span>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ── Initiative Modal (Create/Edit) ── */}
      {showModal && (
        <InitiativeModal
          orgId={orgId ?? user.uid}
          ownerId={user.uid}
          ownerName={profile?.displayName ?? user.email ?? 'User'}
          initiative={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={() => {/* realtime updates via onSnapshot */}}
        />
      )}

      {/* ── Detail Panel ── */}
      {detailItem && (
        <InitiativeDetail
          item={items.find(i => i.id === detailItem.id) ?? detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={() => { handleEdit(detailItem); setDetailItem(null); }}
          onToggleMilestone={msId => handleToggleMS(detailItem, msId)}
        />
      )}

      {/* ── Org Setup Modal — แสดงครั้งแรกที่ user ยังไม่มี org ── */}
      {showOrgSetup && (
        <OrgSetupModal
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onComplete={(id, _orgName, _orgSector) => {
            setOrgId(id);
            setShowOrgSetup(false);
          }}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div className="init-modal-overlay">
          <div className="init-confirm-modal">
            <div className="init-confirm-icon">🗑️</div>
            <div className="init-confirm-title">ลบ Initiative</div>
            <div className="init-confirm-msg">
              คุณแน่ใจหรือไม่ว่าต้องการลบ <strong>&ldquo;{deleteTarget.title}&rdquo;</strong>?
              <br />การกระทำนี้ไม่สามารถย้อนกลับได้
            </div>
            <div className="init-confirm-btns">
              <button className="init-cancel-btn" onClick={() => setDeleteTarget(null)} disabled={deleting}>ยกเลิก</button>
              <button className="init-delete-confirm-btn" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'กำลังลบ...' : '🗑 ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
