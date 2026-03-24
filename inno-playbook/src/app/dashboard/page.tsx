'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Cell,
} from 'recharts';
import { useAuth, isSuperAdmin } from '@/contexts/AuthContext';
import { getAllOrganizations, getOrganizationData, Organization } from '@/lib/actions';
import { subscribeToActivity, ActivityEntry, getCohorts, Cohort } from '@/lib/realtimeActions';
import { exportToPDF, exportToExcel, exportFacilitatorReport } from '@/lib/exportActions';
import { CAPS } from '@/lib/data';
import UserMenu from '@/components/UserMenu';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function calcCapPct(capId: string, data: Record<string, string>): number {
  const cap = CAPS.find((c) => c.id === capId);
  if (!cap) return 0;
  const filled = cap.deliverables.filter((d) => (data[d.id] || '').trim().length > 15).length;
  return Math.round((filled / cap.deliverables.length) * 100);
}

function timeAgo(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const READINESS_COLORS = ['#B91C1C', '#D97706', '#0B7B74'];
function readinessColor(pct: number): string {
  if (pct >= 80) return READINESS_COLORS[2];
  if (pct >= 40) return READINESS_COLORS[1];
  return READINESS_COLORS[0];
}

// ─── Member/Org Dashboard ─────────────────────────────────────────────────────

function OrgDashboard({ orgId, orgName, orgSector }: { orgId: string; orgName: string; orgSector: string }) {
  const [data, setData] = useState<Record<string, string>>({});
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    getOrganizationData(orgId).then((org) => {
      if (org) {
        const d: Record<string, string> = {};
        org.deliverables.forEach((del) => { d[del.fieldId] = del.content; });
        setData(d);
      }
      setLoading(false);
    });
    const unsub = subscribeToActivity(orgId, 20, setActivities);
    return unsub;
  }, [orgId]);

  if (loading) {
    return <div className="dash-loading">Loading dashboard data...</div>;
  }

  const readiness = Math.round(
    (CAPS.reduce((a, c) => a + c.deliverables.filter((d) => (data[d.id] || '').trim().length > 15).length, 0) / TOTAL_FIELDS) * 100,
  );

  const radialData = [{ name: 'Readiness', value: readiness, fill: readinessColor(readiness) }];

  const barData = CAPS.map((c) => ({
    name: c.id,
    pct: calcCapPct(c.id, data),
    fill: c.color,
  }));

  return (
    <div className="dashboard-page">
      <div className="dash-section-title">Organization Analytics</div>
      <div className="dash-org-name">{orgName} <span className="dash-org-sector">{orgSector}</span></div>

      <div className="dash-top-row">
        {/* Radial gauge */}
        <div className="dash-card dash-gauge-card">
          <div className="dash-card-label">ISO 56001 Readiness</div>
          <div className="dash-gauge-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart
                innerRadius="60%"
                outerRadius="90%"
                data={radialData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#E2E8F0' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="dash-gauge-center">
              <div className="dash-gauge-pct" style={{ color: readinessColor(readiness) }}>{readiness}%</div>
              <div className="dash-gauge-lbl">Readiness</div>
            </div>
          </div>
          <div className="dash-gauge-stats">
            <div className="dash-stat">
              <div className="dash-stat-val">{CAPS.reduce((a, c) => a + c.deliverables.filter((d) => (data[d.id] || '').trim().length > 15).length, 0)}</div>
              <div className="dash-stat-lbl">Filled</div>
            </div>
            <div className="dash-stat">
              <div className="dash-stat-val">{TOTAL_FIELDS}</div>
              <div className="dash-stat-lbl">Total</div>
            </div>
            <div className="dash-stat">
              <div className="dash-stat-val">{CAPS.filter((c) => calcCapPct(c.id, data) >= 80).length}</div>
              <div className="dash-stat-lbl">CAPs Ready</div>
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="dash-card dash-bar-card">
          <div className="dash-card-label">Completion by Capability Area</div>
          <div className="dash-chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Completion']}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #CBD5E1' }}
                />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CAP grid */}
      <div className="dash-cap-grid">
        {CAPS.map((cap) => {
          const pct = calcCapPct(cap.id, data);
          return (
            <div key={cap.id} className="dash-cap-card">
              <div className="dash-cap-icon" style={{ background: cap.bg, color: cap.color }}>{cap.id}</div>
              <div className="dash-cap-info">
                <div className="dash-cap-name">{cap.name}</div>
                <div className="dash-cap-bar-wrap">
                  <div className="dash-cap-bar-fill" style={{ width: `${pct}%`, background: cap.color }} />
                </div>
              </div>
              <div className="dash-cap-pct" style={{ color: cap.color }}>{pct}%</div>
            </div>
          );
        })}
      </div>

      {/* Export + Activity */}
      <div className="dash-bottom-row">
        <div className="dash-card dash-export-card">
          <div className="dash-card-label">Export Report</div>
          <div className="dash-export-btns">
            <button
              className="dash-export-btn pdf"
              onClick={() => exportToPDF(orgName, orgSector, data)}
            >
              📄 Export PDF
            </button>
            <button
              className="dash-export-btn excel"
              onClick={() => exportToExcel(orgName, orgSector, data)}
            >
              📊 Export Excel
            </button>
          </div>
        </div>

        <div className="dash-card dash-activity-mini">
          <div className="dash-card-label">Recent Activity</div>
          <div className="dash-activity-list">
            {activities.length === 0 && (
              <div className="dash-activity-empty">No activity yet</div>
            )}
            {activities.slice(0, 8).map((a) => (
              <div key={a.id} className="dash-activity-row">
                <span className="dash-activity-user">{a.displayName}</span>
                <span className="dash-activity-action">{a.action}</span>
                <span className="dash-activity-target">{a.target}</span>
                <span className="dash-activity-time">{timeAgo(a.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Facilitator / Super Admin Dashboard ──────────────────────────────────────

function FacilitatorDashboard() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([getAllOrganizations(), getCohorts()])
      .then(([o, c]) => { setOrgs(o); setCohorts(c); })
      .finally(() => setLoading(false));
  }, []);

  const cohortOrgIds =
    selectedCohort !== 'all'
      ? cohorts.find((c) => c.id === selectedCohort)?.orgIds ?? []
      : null;

  const filteredOrgs = orgs
    .filter((o) => !cohortOrgIds || cohortOrgIds.includes(o.id))
    .filter(
      (o) =>
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        (o.sector || '').toLowerCase().includes(search.toLowerCase()),
    );

  const avgReadiness =
    filteredOrgs.length
      ? Math.round(filteredOrgs.reduce((s, o) => s + calcOrgReadiness(o.deliverables), 0) / filteredOrgs.length)
      : 0;

  const topOrg = filteredOrgs.reduce<{ name: string; pct: number } | null>((best, o) => {
    const pct = calcOrgReadiness(o.deliverables);
    if (!best || pct > best.pct) return { name: o.name, pct };
    return best;
  }, null);

  if (loading) {
    return <div className="dash-loading">Loading facilitator dashboard...</div>;
  }

  const currentCohortName =
    selectedCohort !== 'all'
      ? cohorts.find((c) => c.id === selectedCohort)?.name
      : undefined;

  return (
    <div className="dashboard-page">
      <div className="dash-section-title">Facilitator Overview</div>

      {/* Stats */}
      <div className="dash-stats-row">
        <div className="dash-stat-card" style={{ borderLeftColor: 'var(--navy)' }}>
          <div className="dash-stat-label">Total Organizations</div>
          <div className="dash-stat-big">{filteredOrgs.length}</div>
        </div>
        <div className="dash-stat-card" style={{ borderLeftColor: 'var(--teal)' }}>
          <div className="dash-stat-label">Avg. ISO Readiness</div>
          <div className="dash-stat-big" style={{ color: readinessColor(avgReadiness) }}>{avgReadiness}%</div>
        </div>
        <div className="dash-stat-card" style={{ borderLeftColor: 'var(--purple)' }}>
          <div className="dash-stat-label">Top Performer</div>
          <div className="dash-stat-big dash-stat-name">{topOrg?.name || '—'}</div>
          {topOrg && <div className="dash-stat-sub">{topOrg.pct}% readiness</div>}
        </div>
        <div className="dash-stat-card" style={{ borderLeftColor: 'var(--amber)' }}>
          <div className="dash-stat-label">Cohorts</div>
          <div className="dash-stat-big">{cohorts.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="dash-filters">
        <input
          className="dash-search"
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="dash-cohort-select"
          value={selectedCohort}
          onChange={(e) => setSelectedCohort(e.target.value)}
        >
          <option value="all">All Organizations</option>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          className="dash-export-btn excel"
          onClick={() => exportFacilitatorReport(filteredOrgs, currentCohortName)}
        >
          📊 Export Facilitator Report
        </button>
      </div>

      {/* Org table */}
      <div className="dash-orgs-table">
        <div className="dash-table-hdr">
          <span>Organization</span>
          <span>Sector</span>
          {CAPS.map((c) => <span key={c.id}>{c.id}</span>)}
          <span>Readiness</span>
        </div>
        {filteredOrgs.length === 0 && (
          <div className="dash-table-empty">No organizations found</div>
        )}
        {filteredOrgs.map((org) => {
          const overall = calcOrgReadiness(org.deliverables);
          const color = readinessColor(overall);
          return (
            <div key={org.id} className="dash-table-row">
              <span className="dash-table-orgname">{org.name}</span>
              <span className="dash-table-sector">{org.sector || '—'}</span>
              {CAPS.map((cap) => {
                const cf = cap.deliverables.filter((d) =>
                  org.deliverables.some((od) => od.fieldId === d.id && od.content.trim().length > 15),
                ).length;
                const cp = Math.round((cf / cap.deliverables.length) * 100);
                return (
                  <span key={cap.id}>
                    <div className="dash-cap-mini-bar">
                      <div
                        className="dash-cap-mini-fill"
                        style={{ width: `${cp}%`, background: cp >= 80 ? 'var(--teal)' : cp > 0 ? 'var(--amber)' : '#E2E8F0' }}
                        title={`${cap.id}: ${cp}%`}
                      />
                    </div>
                  </span>
                );
              })}
              <span className="dash-table-readiness" style={{ color }}>{overall}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgSector, setOrgSector] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const localOrgId = localStorage.getItem(`innoPB_orgId_${user.uid}`);
    if (localOrgId) {
      setOrgId(localOrgId);
      getOrganizationData(localOrgId).then((org) => {
        if (org) { setOrgName(org.name); setOrgSector(org.sector || ''); }
      });
    } else if (profile?.orgId) {
      setOrgId(profile.orgId);
      getOrganizationData(profile.orgId).then((org) => {
        if (org) { setOrgName(org.name); setOrgSector(org.sector || ''); }
      });
    }
  }, [user, profile]);

  if (authLoading || !profile) {
    return (
      <div className="dash-loading-screen">
        <span className="logo-badge">MASCI · ISO 56001</span>
        <div style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 12, marginTop: 12 }}>
          Loading Dashboard...
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = isSuperAdmin(profile) || profile.role === 'facilitator';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--thai)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--navy)', padding: '0 24px', height: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '2px solid var(--teal)', position: 'sticky', top: 0, zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="logo-badge">MASCI · ISO 56001</span>
          <span style={{ color: '#E2E8F0', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600 }}>
            📊 Dashboard
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>
            ← Workshop
          </Link>
          {isAdmin && (
            <Link href="/admin" style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>
              Admin
            </Link>
          )}
          <UserMenu />
        </div>
      </div>

      {/* Role tabs for admins */}
      {isAdmin && (
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', gap: 0 }}>
          <Link href="/dashboard" style={{ padding: '10px 18px', fontSize: 12, fontWeight: 600, color: 'var(--teal)', borderBottom: '2px solid var(--teal)', textDecoration: 'none' }}>
            Facilitator View
          </Link>
          {orgId && (
            <Link href="/?tab=org" style={{ padding: '10px 18px', fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
              My Org
            </Link>
          )}
        </div>
      )}

      <div style={{ padding: '24px 28px', maxWidth: 1280, margin: '0 auto' }}>
        {isAdmin ? (
          <FacilitatorDashboard />
        ) : orgId ? (
          <OrgDashboard orgId={orgId} orgName={orgName} orgSector={orgSector} />
        ) : (
          <div className="dash-no-org">
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div style={{ color: 'var(--navy)', fontWeight: 700, fontSize: 18 }}>No organization linked</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
              Go to the{' '}
              <Link href="/" style={{ color: 'var(--teal)' }}>Workshop</Link>
              {' '}and fill in your organization name to get started.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
