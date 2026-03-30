'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, isSuperAdmin } from '@/contexts/AuthContext';
import {
  UserProfile,
  UserRole,
  subscribeToUsers,
  updateUserRole,
  updateUserProfile,
  updateDisplayName,
} from '@/lib/authActions';
import { getAllOrganizations } from '@/lib/actions';
import UserMenu from '@/components/UserMenu';
import GlobalNav from '@/components/GlobalNav';
import { ROUTES } from '@/lib/routes';

// ─── Role metadata ─────────────────────────────────────────────────────────────

const ROLE_META: Record<UserRole, { label: string; color: string; bg: string; desc: string }> = {
  super_admin: { label: 'Super Admin',  color: '#7C3AED', bg: '#F5F3FF', desc: 'เข้าถึงได้ทุกอย่าง จัดการ user/role/org' },
  org_admin:   { label: 'Org Admin',   color: '#0B7B74', bg: '#E6F7F6', desc: 'จัดการองค์กร เชิญสมาชิก ดู report' },
  facilitator: { label: 'Facilitator', color: '#2563EB', bg: '#EFF6FF', desc: 'ดำเนินการ workshop และดู progress' },
  member:      { label: 'Member',      color: '#D97706', bg: '#FFF7ED', desc: 'ทำงานใน workspace ขององค์กรตัวเอง' },
  viewer:      { label: 'Viewer',      color: '#64748B', bg: '#F1F5F9', desc: 'อ่านอย่างเดียว ไม่สามารถแก้ไขได้' },
};

const ALL_ROLES = Object.keys(ROLE_META) as UserRole[];

// ─── Edit User Modal ───────────────────────────────────────────────────────────

function EditUserModal({
  user: target,
  orgs,
  onClose,
  onSaved,
}: {
  user: UserProfile;
  orgs: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(target.displayName);
  const [role, setRole]               = useState<UserRole>(target.role);
  const [orgId, setOrgId]             = useState(target.orgId ?? '');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updates: Partial<Pick<UserProfile, 'displayName' | 'role' | 'orgId'>> = {};
      if (displayName !== target.displayName) updates.displayName = displayName;
      if (role        !== target.role)        updates.role        = role;
      if (orgId       !== (target.orgId ?? '')) updates.orgId   = orgId || undefined;
      if (Object.keys(updates).length > 0) {
        await updateUserProfile(target.uid, updates);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const rm = ROLE_META[role];

  return (
    <div className="um-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="um-modal">
        <div className="um-modal-hdr">
          <div>
            <div className="um-modal-title">✏️ แก้ไขข้อมูล User</div>
            <div className="um-modal-sub">{target.email}</div>
          </div>
          <button className="um-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="um-modal-body">
          {/* UID (read-only) */}
          <div className="um-field">
            <label className="um-label">UID (Firebase Auth)</label>
            <div className="um-uid-box">{target.uid}</div>
          </div>

          {/* Display Name */}
          <div className="um-field">
            <label className="um-label">ชื่อ-นามสกุล</label>
            <input
              className="um-input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Display Name"
            />
          </div>

          {/* Role */}
          <div className="um-field">
            <label className="um-label">Role / สิทธิ์การใช้งาน</label>
            <div className="um-role-grid">
              {ALL_ROLES.map(r => {
                const m = ROLE_META[r];
                return (
                  <button
                    key={r}
                    className={`um-role-option ${role === r ? 'selected' : ''}`}
                    onClick={() => setRole(r)}
                    style={role === r ? { borderColor: m.color, background: m.bg } : {}}
                  >
                    <span className="um-role-badge" style={{ background: m.bg, color: m.color }}>{m.label}</span>
                    <span className="um-role-desc">{m.desc}</span>
                  </button>
                );
              })}
            </div>
            <div className="um-role-preview" style={{ background: rm.bg, color: rm.color }}>
              ✅ Role ที่เลือก: <strong>{rm.label}</strong> — {rm.desc}
            </div>
          </div>

          {/* Org link */}
          <div className="um-field">
            <label className="um-label">เชื่อมกับองค์กร (optional)</label>
            <select className="um-select" value={orgId} onChange={e => setOrgId(e.target.value)}>
              <option value="">— ไม่ระบุ —</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="um-modal-error">{error}</div>}
        <div className="um-modal-foot">
          <button className="um-cancel-btn" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button className="um-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Row ──────────────────────────────────────────────────────────────────

function UserRow({
  u,
  orgs,
  currentUid,
  onEdit,
  onQuickRole,
}: {
  u: UserProfile;
  orgs: { id: string; name: string }[];
  currentUid: string;
  onEdit: (u: UserProfile) => void;
  onQuickRole: (u: UserProfile, r: UserRole) => void;
}) {
  const rm   = ROLE_META[u.role] ?? ROLE_META.member;
  const orgName = orgs.find(o => o.id === u.orgId)?.name;
  const isSelf = u.uid === currentUid;

  const lastActive = u.lastActive
    ? new Date((u.lastActive as { seconds: number }).seconds * 1000).toLocaleDateString('th-TH', {
        day: '2-digit', month: 'short', year: '2-digit',
      })
    : '—';

  return (
    <div className={`um-row ${isSelf ? 'self' : ''}`}>
      {/* Avatar + Info */}
      <div className="um-row-user">
        <div className="um-avatar" style={{ background: rm.color }}>
          {(u.displayName || u.email || '?')[0].toUpperCase()}
        </div>
        <div className="um-row-info">
          <div className="um-row-name">
            {u.displayName || '(ไม่มีชื่อ)'}
            {isSelf && <span className="um-self-badge">คุณ</span>}
          </div>
          <div className="um-row-email">{u.email}</div>
        </div>
      </div>

      {/* Role badge + quick change */}
      <div className="um-row-role">
        <span className="um-role-badge" style={{ background: rm.bg, color: rm.color }}>{rm.label}</span>
        {!isSelf && (
          <select
            className="um-quick-role-sel"
            value={u.role}
            onChange={e => onQuickRole(u, e.target.value as UserRole)}
            title="เปลี่ยน Role ด่วน"
          >
            {ALL_ROLES.map(r => (
              <option key={r} value={r}>{ROLE_META[r].label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Org */}
      <div className="um-row-org">
        {orgName ? (
          <span className="um-org-chip">{orgName}</span>
        ) : (
          <span className="um-no-org">—</span>
        )}
      </div>

      {/* Last Active */}
      <div className="um-row-date">{lastActive}</div>

      {/* UID */}
      <div className="um-row-uid" title={u.uid}>{u.uid.slice(0, 12)}…</div>

      {/* Actions */}
      <div className="um-row-actions">
        <button className="um-edit-btn" onClick={() => onEdit(u)}>✏️ แก้ไข</button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users,       setUsers]       = useState<UserProfile[]>([]);
  const [orgs,        setOrgs]        = useState<{ id: string; name: string }[]>([]);
  const [search,      setSearch]      = useState('');
  const [filterRole,  setFilterRole]  = useState<UserRole | 'all'>('all');
  const [editTarget,  setEditTarget]  = useState<UserProfile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState('');

  // ── Auth guard — super_admin only ──────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace(ROUTES.AUTH.LOGIN); return; }
    if (profile && !isSuperAdmin(profile)) { router.replace(ROUTES.HOME); }
  }, [user, profile, authLoading, router]);

  // ── Load orgs ──────────────────────────────────────────────────────────────
  useEffect(() => {
    getAllOrganizations()
      .then(list => setOrgs(list.map(o => ({ id: o.id, name: o.name }))))
      .catch(console.error);
  }, []);

  // ── Subscribe to users ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile || !isSuperAdmin(profile)) return;
    setLoading(true);
    const unsub = subscribeToUsers(list => {
      // Sort: super_admin first, then by displayName
      const sorted = [...list].sort((a, b) => {
        const roleOrder: Record<UserRole, number> = {
          super_admin: 0, org_admin: 1, facilitator: 2, member: 3, viewer: 4,
        };
        const rd = (roleOrder[a.role] ?? 5) - (roleOrder[b.role] ?? 5);
        if (rd !== 0) return rd;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });
      setUsers(sorted);
      setLoading(false);
    });
    return unsub;
  }, [profile]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === 'all' || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const counts = {} as Record<UserRole, number>;
    ALL_ROLES.forEach(r => { counts[r] = 0; });
    users.forEach(u => { counts[u.role] = (counts[u.role] ?? 0) + 1; });
    return counts;
  }, [users]);

  // ── Quick role change ──────────────────────────────────────────────────────
  const handleQuickRole = async (u: UserProfile, role: UserRole) => {
    await updateUserRole(u.uid, role);
    showToast(`✅ เปลี่ยน role ${u.displayName || u.email} → ${ROLE_META[role].label}`);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  if (authLoading || !profile) {
    return (
      <div className="um-loading-screen">กำลังตรวจสอบสิทธิ์...</div>
    );
  }
  if (!isSuperAdmin(profile)) return null;

  return (
    <div className="um-page-root gnav-offset">
      <GlobalNav />
      {/* ── Top Bar ── */}
      <div className="um-topbar">
        <div className="um-topbar-left">
          <span className="logo-badge">MASCI · ISO 56001</span>
          <span className="um-topbar-title">👤 User Management</span>
        </div>
        <div className="um-topbar-right">
          <Link href={ROUTES.ADMIN} className="um-nav-link">← Admin</Link>
          <Link href={ROUTES.INITIATIVES} className="um-nav-link">🚀 Initiatives</Link>
          <UserMenu />
        </div>
      </div>

      <div className="um-content">
        {/* ── Page Header ── */}
        <div className="um-page-hdr">
          <div>
            <div className="um-page-title">จัดการผู้ใช้งาน (User Management)</div>
            <div className="um-page-sub">กำหนดสิทธิ์ Role และเชื่อมองค์กรให้ผู้ใช้งานทุกคน</div>
          </div>
        </div>

        {/* ── Role Stats ── */}
        <div className="um-stats-row">
          <div className="um-stat-total">
            <div className="um-stat-num">{users.length}</div>
            <div className="um-stat-lbl">Total Users</div>
          </div>
          {ALL_ROLES.map(r => {
            const m = ROLE_META[r];
            return (
              <button
                key={r}
                className={`um-stat-role ${filterRole === r ? 'active' : ''}`}
                style={filterRole === r ? { borderColor: m.color, background: m.bg } : {}}
                onClick={() => setFilterRole(filterRole === r ? 'all' : r)}
              >
                <div className="um-stat-role-num" style={{ color: m.color }}>{stats[r]}</div>
                <div className="um-stat-role-lbl" style={filterRole === r ? { color: m.color } : {}}>
                  {m.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className="um-toolbar">
          <input
            className="um-search"
            placeholder="🔍 ค้นหา email, ชื่อ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="um-filter-sel" value={filterRole} onChange={e => setFilterRole(e.target.value as UserRole | 'all')}>
            <option value="all">All Roles ({users.length})</option>
            {ALL_ROLES.map(r => (
              <option key={r} value={r}>{ROLE_META[r].label} ({stats[r]})</option>
            ))}
          </select>
          <div className="um-result-count">{filtered.length} รายการ</div>
        </div>

        {/* ── Permissions Reference ── */}
        <div className="um-perm-box">
          <div className="um-perm-title">📋 สรุปสิทธิ์การใช้งาน</div>
          <div className="um-perm-grid">
            {ALL_ROLES.map(r => {
              const m = ROLE_META[r];
              return (
                <div key={r} className="um-perm-item">
                  <span className="um-role-badge" style={{ background: m.bg, color: m.color }}>{m.label}</span>
                  <span className="um-perm-desc">{m.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── List Header ── */}
        <div className="um-list-hdr">
          <span style={{ flex: 3 }}>ผู้ใช้งาน</span>
          <span style={{ flex: 1.5 }}>Role</span>
          <span style={{ flex: 2 }}>องค์กร</span>
          <span style={{ flex: 1 }}>Last Active</span>
          <span style={{ flex: 1.5 }}>UID</span>
          <span style={{ width: 80 }}>จัดการ</span>
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className="um-loading">⏳ กำลังโหลดข้อมูลผู้ใช้งาน...</div>
        ) : filtered.length === 0 ? (
          <div className="um-empty">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข</div>
        ) : (
          <div className="um-list">
            {filtered.map(u => (
              <UserRow
                key={u.uid}
                u={u}
                orgs={orgs}
                currentUid={user!.uid}
                onEdit={setEditTarget}
                onQuickRole={handleQuickRole}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editTarget && (
        <EditUserModal
          user={editTarget}
          orgs={orgs}
          onClose={() => setEditTarget(null)}
          onSaved={() => showToast('✅ บันทึกข้อมูลผู้ใช้เรียบร้อย')}
        />
      )}

      {/* ── Toast ── */}
      {toast && <div className="um-toast">{toast}</div>}
    </div>
  );
}
