'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getExperts,
  createExpert,
  deleteExpert,
  requestConnection,
  getMyRequests,
  getAllRequests,
  respondToRequest,
  SEED_EXPERTS,
  Expert,
  ConnectionRequest,
} from '@/lib/expertActions';
import { useAuth, isSuperAdmin } from '@/contexts/AuthContext';
import { getUserOrgId } from '@/lib/authActions';
import { getOrganizationData } from '@/lib/actions';
import UserMenu from '@/components/UserMenu';
import GlobalNav from '@/components/GlobalNav';
import { ROUTES } from '@/lib/routes';

// ─── Expert Card ──────────────────────────────────────────────────────────────

function ExpertCard({
  expert,
  onConnect,
  onDelete,
  isAdmin,
  myRequestExpertIds,
}: {
  expert: Expert;
  onConnect: (expert: Expert) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  myRequestExpertIds: Set<string>;
}) {
  const avail = {
    available: { label: 'Available', color: '#059669', bg: '#F0FDF4' },
    limited: { label: 'Limited', color: '#D97706', bg: '#FFFBEB' },
    unavailable: { label: 'Unavailable', color: '#DC2626', bg: '#FFF1F2' },
  }[expert.availability];

  const alreadyRequested = myRequestExpertIds.has(expert.id);

  return (
    <div className="expert-card">
      <div className="expert-card-top">
        <div className="expert-avatar" style={{ background: expert.avatarColor }}>
          {expert.avatarInitials}
        </div>
        <div className="expert-info">
          <div className="expert-name">{expert.name}</div>
          <div className="expert-title">{expert.title}</div>
          <div className="expert-org">{expert.organization}</div>
        </div>
        <div className="expert-avail-badge" style={{ color: avail.color, background: avail.bg }}>
          {avail.label}
        </div>
      </div>

      <div className="expert-bio">{expert.bio}</div>

      <div className="expert-tags-section">
        <div className="expert-tag-row">
          {expert.specializations.map((s) => (
            <span key={s} className="expert-tag spec">{s}</span>
          ))}
        </div>
        <div className="expert-tag-row">
          {expert.industries.map((i) => (
            <span key={i} className="expert-tag ind">{i}</span>
          ))}
        </div>
      </div>

      {expert.rating > 0 && (
        <div className="expert-rating">
          {'★'.repeat(Math.round(expert.rating))}{'☆'.repeat(5 - Math.round(expert.rating))}
          <span className="expert-sessions">{expert.sessionsCount} sessions</span>
        </div>
      )}

      <div className="expert-card-foot">
        {expert.linkedIn && (
          <a href={expert.linkedIn} target="_blank" rel="noopener noreferrer" className="expert-linkedin">
            in LinkedIn
          </a>
        )}
        <div style={{ flex: 1 }} />
        {isAdmin && (
          <button className="expert-delete-btn" onClick={() => onDelete(expert.id)} title="Delete expert">
            🗑
          </button>
        )}
        <button
          className={`expert-connect-btn ${alreadyRequested ? 'requested' : ''}`}
          disabled={expert.availability === 'unavailable' || alreadyRequested}
          onClick={() => !alreadyRequested && onConnect(expert)}
        >
          {alreadyRequested ? '✓ Requested' : '🤝 Connect'}
        </button>
      </div>
    </div>
  );
}

// ─── Connect Modal ────────────────────────────────────────────────────────────

function ConnectModal({
  expert,
  orgName,
  onClose,
  onSubmit,
}: {
  expert: Expert;
  orgName: string;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    await onSubmit(message.trim());
    setLoading(false);
  };

  return (
    <div className="expert-modal-overlay" onClick={onClose}>
      <div className="expert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="expert-modal-hdr">
          <div className="expert-modal-title">Connect with Expert</div>
          <button className="expert-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="expert-modal-body">
          <div className="expert-modal-expert-row">
            <div className="expert-avatar sm" style={{ background: expert.avatarColor }}>
              {expert.avatarInitials}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>{expert.name}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>{expert.title} · {expert.organization}</div>
            </div>
          </div>
          <div className="expert-modal-from">
            From: <strong>{orgName}</strong>
          </div>
          <label className="expert-field-label">Your Message</label>
          <textarea
            className="expert-field-textarea"
            placeholder={`Hi ${expert.name.split(' ')[0]}, I'd like to discuss our innovation journey and explore potential collaboration on...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
          />
          <div className="expert-modal-hint">
            The expert will be notified via email at <strong>{expert.contactEmail}</strong>
          </div>
        </div>
        <div className="expert-modal-foot">
          <button className="expert-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="expert-submit-btn"
            disabled={!message.trim() || loading}
            onClick={handleSubmit}
          >
            {loading ? 'Sending...' : '📨 Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Expert Modal (admin) ─────────────────────────────────────────────────

function AddExpertModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: Omit<Expert, 'id' | 'avatarInitials' | 'avatarColor' | 'rating' | 'sessionsCount' | 'createdAt'>) => Promise<void>;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '', title: '', organization: '', bio: '',
    specializations: '', industries: '', contactEmail: '', linkedIn: '',
    availability: 'available' as Expert['availability'],
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    if (!form.name || !form.title || !form.contactEmail) return;
    setLoading(true);
    await onAdd({
      name: form.name,
      title: form.title,
      organization: form.organization,
      bio: form.bio,
      specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
      industries: form.industries.split(',').map((s) => s.trim()).filter(Boolean),
      contactEmail: form.contactEmail,
      linkedIn: form.linkedIn || undefined,
      availability: form.availability,
      createdBy: user?.uid ?? 'admin',
    });
    setLoading(false);
  };

  const Field = ({ label, k, placeholder, multiline = false }: { label: string; k: string; placeholder?: string; multiline?: boolean }) => (
    <div style={{ marginBottom: 14 }}>
      <label className="expert-field-label">{label}</label>
      {multiline ? (
        <textarea
          className="expert-field-textarea"
          placeholder={placeholder}
          value={(form as any)[k]}
          onChange={(e) => set(k, e.target.value)}
          rows={3}
        />
      ) : (
        <input
          className="expert-field-input"
          placeholder={placeholder}
          value={(form as any)[k]}
          onChange={(e) => set(k, e.target.value)}
        />
      )}
    </div>
  );

  return (
    <div className="expert-modal-overlay" onClick={onClose}>
      <div className="expert-modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="expert-modal-hdr">
          <div className="expert-modal-title">Add Expert Profile</div>
          <button className="expert-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="expert-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <Field label="Full Name *" k="name" placeholder="Dr. Firstname Lastname" />
          <Field label="Title / Role *" k="title" placeholder="Innovation Strategy Advisor" />
          <Field label="Organization" k="organization" placeholder="Company / Institution" />
          <Field label="Bio" k="bio" placeholder="Brief professional background..." multiline />
          <Field label="Specializations (comma-separated)" k="specializations" placeholder="ISO 56001, Design Thinking, Lean Startup" />
          <Field label="Industries (comma-separated)" k="industries" placeholder="Manufacturing, Healthcare" />
          <Field label="Contact Email *" k="contactEmail" placeholder="expert@example.com" />
          <Field label="LinkedIn URL" k="linkedIn" placeholder="https://linkedin.com/in/..." />
          <div style={{ marginBottom: 14 }}>
            <label className="expert-field-label">Availability</label>
            <select
              className="expert-field-input"
              value={form.availability}
              onChange={(e) => set('availability', e.target.value)}
            >
              <option value="available">Available</option>
              <option value="limited">Limited</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
        </div>
        <div className="expert-modal-foot">
          <button className="expert-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="expert-submit-btn"
            disabled={!form.name || !form.title || !form.contactEmail || loading}
            onClick={handleAdd}
          >
            {loading ? 'Adding...' : '➕ Add Expert'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpertsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [experts, setExperts] = useState<Expert[]>([]);
  const [myRequests, setMyRequests] = useState<ConnectionRequest[]>([]);
  const [allRequests, setAllRequests] = useState<ConnectionRequest[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterSpec, setFilterSpec] = useState('');
  const [filterAvail, setFilterAvail] = useState('');

  const [connectTarget, setConnectTarget] = useState<Expert | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [toast, setToast] = useState('');

  const isAdmin = profile ? (isSuperAdmin(profile) || profile.role === 'facilitator') : false;

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.replace(ROUTES.AUTH.LOGIN);
  }, [user, authLoading, router]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const localId = localStorage.getItem(`innoPB_orgId_${user.uid}`);
    if (localId) { setOrgId(localId); return; }
    getUserOrgId(user.uid).then((id) => {
      if (id) {
        setOrgId(id);
        localStorage.setItem(`innoPB_orgId_${user.uid}`, id);
      } else if (profile?.role === 'super_admin') {
        setOrgId(user.uid);
      }
    });
  }, [user, profile?.role]);

  useEffect(() => {
    if (!orgId) return;
    getOrganizationData(orgId).then((org) => { if (org) setOrgName(org.name); });
  }, [orgId]);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    Promise.all([
      getExperts(),
      getMyRequests(user.uid),
      isAdmin ? getAllRequests() : Promise.resolve([]),
    ]).then(([e, r, ar]) => {
      setExperts(e);
      setMyRequests(r);
      setAllRequests(ar);
      setLoading(false);
    });
  }, [user, isAdmin]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // ── Seed experts (admin only) ──────────────────────────────────────────────
  const seedExperts = async () => {
    for (const seed of SEED_EXPERTS) {
      await createExpert({ ...seed, createdBy: user?.uid ?? 'admin' });
    }
    const e = await getExperts();
    setExperts(e);
    showToast('✅ Sample experts added successfully!');
  };

  // ── Connect ────────────────────────────────────────────────────────────────
  const handleConnect = async (message: string) => {
    if (!connectTarget || !user || !orgId) return;
    await requestConnection(
      connectTarget.id,
      connectTarget.name,
      orgId,
      orgName,
      user.uid,
      profile?.displayName || user.email || 'User',
      message,
    );
    const r = await getMyRequests(user.uid);
    setMyRequests(r);
    setConnectTarget(null);
    showToast('🤝 Connection request sent!');
  };

  // ── Admin: add expert ──────────────────────────────────────────────────────
  const handleAddExpert = async (data: Parameters<typeof createExpert>[0]) => {
    await createExpert(data);
    const e = await getExperts();
    setExperts(e);
    setShowAdd(false);
    showToast('✅ Expert added successfully!');
  };

  // ── Admin: delete expert ───────────────────────────────────────────────────
  const handleDeleteExpert = async (id: string) => {
    if (!confirm('Delete this expert?')) return;
    await deleteExpert(id);
    setExperts((prev) => prev.filter((e) => e.id !== id));
    showToast('🗑 Expert removed');
  };

  // ── Admin: respond to request ──────────────────────────────────────────────
  const handleRespond = async (requestId: string, status: 'accepted' | 'declined') => {
    await respondToRequest(requestId, status);
    const ar = await getAllRequests();
    setAllRequests(ar);
    showToast(status === 'accepted' ? '✅ Request accepted' : '❌ Request declined');
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const allSpecs = Array.from(new Set(experts.flatMap((e) => e.specializations)));

  const filtered = experts.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      e.organization.toLowerCase().includes(q) ||
      e.bio.toLowerCase().includes(q);
    const matchSpec = !filterSpec || e.specializations.includes(filterSpec);
    const matchAvail = !filterAvail || e.availability === filterAvail;
    return matchSearch && matchSpec && matchAvail;
  });

  const myRequestExpertIds = new Set(myRequests.map((r) => r.expertId));
  const pendingCount = allRequests.filter((r) => r.status === 'pending').length;

  if (authLoading || !profile) {
    return (
      <div className="canvas-loading">
        <span className="logo-badge">MASCI · ISO 56001</span>
        <div style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 12, marginTop: 12 }}>
          Loading Expert Network...
        </div>
      </div>
    );
  }

  return (
    <div className="gnav-offset" style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--thai)' }}>
      <GlobalNav />

      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--navy)', padding: '0 24px', height: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '2px solid var(--teal)', position: 'sticky', top: 0, zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="logo-badge">MASCI · ISO 56001</span>
          <span style={{ color: '#E2E8F0', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600 }}>
            👥 Expert Network
          </span>
          {experts.length > 0 && (
            <span style={{ background: 'rgba(255,255,255,.1)', color: '#CBD5E1', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)' }}>
              {experts.length} experts
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAdmin && pendingCount > 0 && (
            <button
              onClick={() => setShowRequests(true)}
              style={{ background: 'var(--amber)', color: 'white', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontFamily: 'var(--mono)', cursor: 'pointer', fontWeight: 700 }}
            >
              📋 {pendingCount} Pending
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              style={{ background: 'var(--teal)', color: 'white', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontFamily: 'var(--mono)', cursor: 'pointer', fontWeight: 700 }}
            >
              ➕ Add Expert
            </button>
          )}
          <Link href={ROUTES.CANVAS} style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>🗺️ Canvas</Link>
          <Link href={ROUTES.DASHBOARD} style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>📊 Dashboard</Link>
          <Link href={ROUTES.INITIATIVES} style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>🚀 Initiatives</Link>
          <UserMenu />
        </div>
      </div>

      <div style={{ padding: '24px 28px', maxWidth: 1280, margin: '0 auto' }}>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div className="experts-hero">
          <div>
            <div className="experts-hero-title">Innovation Expert Network</div>
            <div className="experts-hero-sub">
              Connect with world-class innovation advisors, facilitators, and thought leaders
            </div>
          </div>
          {myRequests.length > 0 && (
            <div className="experts-my-requests">
              <div className="experts-my-req-label">My Requests</div>
              {myRequests.slice(0, 3).map((r) => (
                <div key={r.id} className="experts-my-req-row">
                  <span className="experts-my-req-name">{r.expertName}</span>
                  <span className={`experts-req-status ${r.status}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="experts-filters">
          <input
            className="experts-search"
            placeholder="Search by name, title, expertise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="experts-filter-select"
            value={filterSpec}
            onChange={(e) => setFilterSpec(e.target.value)}
          >
            <option value="">All Specializations</option>
            {allSpecs.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="experts-filter-select"
            value={filterAvail}
            onChange={(e) => setFilterAvail(e.target.value)}
          >
            <option value="">All Availability</option>
            <option value="available">Available</option>
            <option value="limited">Limited</option>
          </select>
          <span className="experts-filter-count">{filtered.length} of {experts.length}</span>
        </div>

        {/* ── Grid ────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="dash-loading">Loading expert profiles...</div>
        ) : experts.length === 0 ? (
          <div className="experts-empty">
            <div style={{ fontSize: 56 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--navy)', marginBottom: 8 }}>
              No experts added yet
            </div>
            <div style={{ color: 'var(--muted)', marginBottom: 20 }}>
              {isAdmin
                ? 'Start by adding expert profiles or loading sample data.'
                : 'Expert profiles will appear here once added by your facilitator.'}
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="experts-cta-btn primary" onClick={() => setShowAdd(true)}>
                  ➕ Add Expert
                </button>
                <button className="experts-cta-btn secondary" onClick={seedExperts}>
                  📦 Load Sample Experts
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="experts-grid">
            {filtered.map((expert) => (
              <ExpertCard
                key={expert.id}
                expert={expert}
                onConnect={setConnectTarget}
                onDelete={handleDeleteExpert}
                isAdmin={isAdmin}
                myRequestExpertIds={myRequestExpertIds}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Admin: Pending requests panel ───────────────────────────────────── */}
      {showRequests && isAdmin && (
        <div className="expert-modal-overlay" onClick={() => setShowRequests(false)}>
          <div className="expert-modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="expert-modal-hdr">
              <div className="expert-modal-title">Connection Requests</div>
              <button className="expert-modal-close" onClick={() => setShowRequests(false)}>✕</button>
            </div>
            <div className="expert-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {allRequests.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No requests yet</div>
              ) : (
                allRequests.map((r) => (
                  <div key={r.id} className="expert-req-item">
                    <div className="expert-req-header">
                      <strong>{r.userName}</strong> from <em>{r.orgName}</em>
                      <span className={`experts-req-status ${r.status}`} style={{ marginLeft: 'auto' }}>{r.status}</span>
                    </div>
                    <div className="expert-req-to">→ {r.expertName}</div>
                    <div className="expert-req-msg">{r.message}</div>
                    {r.status === 'pending' && (
                      <div className="expert-req-actions">
                        <button className="expert-req-accept" onClick={() => handleRespond(r.id, 'accepted')}>
                          ✅ Accept
                        </button>
                        <button className="expert-req-decline" onClick={() => handleRespond(r.id, 'declined')}>
                          ❌ Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {connectTarget && (
        <ConnectModal
          expert={connectTarget}
          orgName={orgName}
          onClose={() => setConnectTarget(null)}
          onSubmit={handleConnect}
        />
      )}
      {showAdd && isAdmin && (
        <AddExpertModal
          onClose={() => setShowAdd(false)}
          onAdd={handleAddExpert}
        />
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && <div className="expert-toast">{toast}</div>}
    </div>
  );
}
