'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, isSuperAdmin } from '@/contexts/AuthContext';
import {
  getCohorts,
  createCohort,
  addOrgToCohort,
  removeOrgFromCohort,
  Cohort,
} from '@/lib/realtimeActions';
import { getAllOrganizations, Organization } from '@/lib/actions';
import { CAPS } from '@/lib/data';
import UserMenu from '@/components/UserMenu';
import GlobalNav from '@/components/GlobalNav';
import { ROUTES } from '@/lib/routes';

const TOTAL_FIELDS = CAPS.reduce((a, c) => a + c.deliverables.length, 0);

function calcOrgReadiness(deliverables: { fieldId: string; content: string }[]): number {
  const filled = CAPS.reduce(
    (a, c) =>
      a +
      c.deliverables.filter((d) =>
        deliverables.some((od) => od.fieldId === d.id && od.content.trim().length > 15),
      ).length,
    0,
  );
  return Math.round((filled / TOTAL_FIELDS) * 100);
}

function readinessColor(pct: number): string {
  if (pct >= 80) return 'var(--teal)';
  if (pct >= 40) return 'var(--amber)';
  return 'var(--red)';
}

// ─── Create Cohort Modal ──────────────────────────────────────────────────────

interface CreateModalProps {
  adminId: string;
  onCreated: () => void;
  onClose: () => void;
}

function CreateCohortModal({ adminId, onCreated, onClose }: CreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      await createCohort(name.trim(), description.trim(), adminId);
      onCreated();
      onClose();
    } catch (e) {
      setError('Failed to create cohort');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cohort-modal-overlay" onClick={onClose}>
      <div className="cohort-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cohort-modal-hdr">
          <span className="cohort-modal-title">Create New Cohort</span>
          <button className="cohort-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cohort-modal-body">
          <label className="cohort-field-label">Cohort Name *</label>
          <input
            className="cohort-field-input"
            placeholder="e.g. Batch 2024 Q1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <label className="cohort-field-label" style={{ marginTop: 12 }}>Description</label>
          <textarea
            className="cohort-field-input cohort-field-textarea"
            placeholder="Optional description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          {error && <div className="cohort-error">{error}</div>}
        </div>
        <div className="cohort-modal-foot">
          <button className="cohort-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="cohort-btn-create" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating...' : 'Create Cohort'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cohort Detail Panel ──────────────────────────────────────────────────────

interface DetailProps {
  cohort: Cohort;
  allOrgs: Organization[];
  onUpdated: () => void;
  onClose: () => void;
}

function CohortDetailPanel({ cohort, allOrgs, onUpdated, onClose }: DetailProps) {
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const cohortOrgs = allOrgs.filter((o) => cohort.orgIds.includes(o.id));
  const availableOrgs = allOrgs.filter(
    (o) =>
      !cohort.orgIds.includes(o.id) &&
      (o.name.toLowerCase().includes(search.toLowerCase()) ||
        (o.sector || '').toLowerCase().includes(search.toLowerCase())),
  );

  const handleAdd = async (orgId: string) => {
    setAdding(orgId);
    try {
      await addOrgToCohort(cohort.id, orgId);
      onUpdated();
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (orgId: string) => {
    setRemoving(orgId);
    try {
      await removeOrgFromCohort(cohort.id, orgId);
      onUpdated();
    } finally {
      setRemoving(null);
    }
  };

  const avgReadiness =
    cohortOrgs.length
      ? Math.round(cohortOrgs.reduce((s, o) => s + calcOrgReadiness(o.deliverables), 0) / cohortOrgs.length)
      : 0;

  return (
    <div className="cohort-detail-overlay" onClick={onClose}>
      <div className="cohort-detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cohort-detail-hdr">
          <div>
            <div className="cohort-detail-title">{cohort.name}</div>
            {cohort.description && (
              <div className="cohort-detail-desc">{cohort.description}</div>
            )}
          </div>
          <button className="cohort-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="cohort-detail-stats">
          <div className="cohort-detail-stat">
            <div className="cohort-detail-stat-val">{cohortOrgs.length}</div>
            <div className="cohort-detail-stat-lbl">Organizations</div>
          </div>
          <div className="cohort-detail-stat">
            <div className="cohort-detail-stat-val" style={{ color: readinessColor(avgReadiness) }}>
              {avgReadiness}%
            </div>
            <div className="cohort-detail-stat-lbl">Avg. Readiness</div>
          </div>
        </div>

        {/* Current orgs */}
        <div className="cohort-detail-section-label">Current Organizations ({cohortOrgs.length})</div>
        <div className="cohort-orgs-list">
          {cohortOrgs.length === 0 && (
            <div className="cohort-orgs-empty">No organizations in this cohort yet</div>
          )}
          {cohortOrgs.map((org) => {
            const pct = calcOrgReadiness(org.deliverables);
            return (
              <div key={org.id} className="cohort-org-row">
                <div className="cohort-org-info">
                  <div className="cohort-org-name">{org.name}</div>
                  <div className="cohort-org-sector">{org.sector || '—'}</div>
                </div>
                <div className="cohort-org-readiness" style={{ color: readinessColor(pct) }}>{pct}%</div>
                <button
                  className="cohort-org-remove"
                  onClick={() => handleRemove(org.id)}
                  disabled={removing === org.id}
                >
                  {removing === org.id ? '...' : 'Remove'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Add orgs */}
        <div className="cohort-detail-section-label" style={{ marginTop: 20 }}>Add Organizations</div>
        <input
          className="cohort-field-input"
          style={{ marginBottom: 10 }}
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="cohort-orgs-list cohort-add-list">
          {availableOrgs.length === 0 && (
            <div className="cohort-orgs-empty">No available organizations</div>
          )}
          {availableOrgs.slice(0, 10).map((org) => (
            <div key={org.id} className="cohort-org-row">
              <div className="cohort-org-info">
                <div className="cohort-org-name">{org.name}</div>
                <div className="cohort-org-sector">{org.sector || '—'}</div>
              </div>
              <button
                className="cohort-org-add"
                onClick={() => handleAdd(org.id)}
                disabled={adding === org.id}
              >
                {adding === org.id ? '...' : '+ Add'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CohortsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.replace(ROUTES.AUTH.LOGIN); return; }
    if (!authLoading && profile && !isSuperAdmin(profile)) { router.replace(ROUTES.HOME); }
  }, [user, profile, authLoading, router]);

  const loadData = () => {
    Promise.all([getCohorts(), getAllOrganizations()])
      .then(([c, o]) => { setCohorts(c); setAllOrgs(o); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (profile && isSuperAdmin(profile)) loadData();
  }, [profile]);

  // Refresh selectedCohort after update
  const handleUpdated = () => {
    loadData();
    if (selectedCohort) {
      getCohorts().then((fresh) => {
        const updated = fresh.find((c) => c.id === selectedCohort.id);
        if (updated) setSelectedCohort(updated);
      });
    }
  };

  if (authLoading || !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }

  if (!isSuperAdmin(profile)) return null;

  return (
    <div className="gnav-offset" style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--thai)' }}>
      <GlobalNav />
      {/* Header */}
      <div style={{
        background: 'var(--navy)', padding: '0 24px', height: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '2px solid var(--teal)', position: 'sticky', top: 0, zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="logo-badge">MASCI · ISO 56001</span>
          <span style={{ color: '#E2E8F0', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600 }}>
            👥 Cohort Management
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href={ROUTES.INITIATIVES} style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>🚀 Initiatives</Link>
          <Link href={ROUTES.ADMIN} style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>Admin</Link>
          <Link href={ROUTES.DASHBOARD} style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>Dashboard</Link>
          <UserMenu />
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>Cohorts</h1>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
              Group organizations into cohorts for batch management and reporting
            </p>
          </div>
          <button
            className="cohort-btn-create"
            onClick={() => setShowCreate(true)}
          >
            + New Cohort
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', borderLeft: '4px solid var(--navy)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>Total Cohorts</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)' }}>{cohorts.length}</div>
          </div>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', borderLeft: '4px solid var(--teal)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>Total Organizations</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--teal)' }}>{allOrgs.length}</div>
          </div>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', borderLeft: '4px solid var(--purple)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>Unassigned Orgs</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--purple)' }}>
              {allOrgs.filter((o) => !cohorts.some((c) => c.orgIds.includes(o.id))).length}
            </div>
          </div>
        </div>

        {/* Cohort grid */}
        {loading ? (
          <div style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>Loading cohorts...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {cohorts.map((cohort) => {
              const cohortOrgs = allOrgs.filter((o) => cohort.orgIds.includes(o.id));
              const avg = cohortOrgs.length
                ? Math.round(cohortOrgs.reduce((s, o) => s + calcOrgReadiness(o.deliverables), 0) / cohortOrgs.length)
                : 0;

              return (
                <div
                  key={cohort.id}
                  className="cohort-card"
                  onClick={() => setSelectedCohort(cohort)}
                >
                  <div className="cohort-card-hdr">
                    <div className="cohort-card-name">{cohort.name}</div>
                    <div className="cohort-card-readiness" style={{ color: readinessColor(avg) }}>{avg}%</div>
                  </div>
                  {cohort.description && (
                    <div className="cohort-card-desc">{cohort.description}</div>
                  )}
                  <div className="cohort-card-meta">
                    <span>{cohortOrgs.length} organization{cohortOrgs.length !== 1 ? 's' : ''}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>Click to manage</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                    {cohortOrgs.slice(0, 6).map((o) => {
                      const pct = calcOrgReadiness(o.deliverables);
                      return (
                        <div
                          key={o.id}
                          style={{
                            flex: 1, height: 4, borderRadius: 2,
                            background: pct >= 80 ? 'var(--teal)' : pct > 0 ? 'var(--amber)' : '#E2E8F0',
                          }}
                          title={`${o.name}: ${pct}%`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {cohorts.length === 0 && (
              <div style={{ gridColumn: '1/-1', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
                No cohorts yet. Click "+ New Cohort" to create one.
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && user && (
        <CreateCohortModal
          adminId={user.uid}
          onCreated={loadData}
          onClose={() => setShowCreate(false)}
        />
      )}

      {selectedCohort && (
        <CohortDetailPanel
          cohort={selectedCohort}
          allOrgs={allOrgs}
          onUpdated={handleUpdated}
          onClose={() => setSelectedCohort(null)}
        />
      )}
    </div>
  );
}
