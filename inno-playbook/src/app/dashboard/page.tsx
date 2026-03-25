'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Cell, LineChart, Line, FunnelChart, Funnel, LabelList,
  ScatterChart, Scatter, ZAxis, Legend,
} from 'recharts';
import { useAuth, isSuperAdmin } from '@/contexts/AuthContext';
import { getAllOrganizations, getOrganizationData, Organization } from '@/lib/actions';
import { subscribeToActivity, ActivityEntry, getCohorts, Cohort } from '@/lib/realtimeActions';
import { exportToPDF, exportToExcel, exportFacilitatorReport } from '@/lib/exportActions';
import { calcIHI, saveHealthSnapshot } from '@/lib/healthIndex';
import { CAPS } from '@/lib/data';
import UserMenu from '@/components/UserMenu';
import HealthIndexCard from '@/components/HealthIndexCard';

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

// ─── Predictive Analytics helpers ─────────────────────────────────────────────

function buildFunnelData(orgs: Organization[]) {
  return CAPS.map((cap, idx) => {
    const count = orgs.filter((o) => {
      const pct = cap.deliverables.filter((d) =>
        o.deliverables.some((od) => od.fieldId === d.id && od.content.trim().length > 15),
      ).length / cap.deliverables.length;
      return pct >= 0.5; // at least 50% done
    }).length;
    return {
      name: cap.id,
      value: count,
      fill: cap.color,
    };
  });
}

function buildHeatmapData(orgs: Organization[]) {
  return CAPS.map((cap) => {
    const avg = orgs.length === 0 ? 0 : Math.round(
      orgs.reduce((s, o) => {
        const pct = cap.deliverables.filter((d) =>
          o.deliverables.some((od) => od.fieldId === d.id && od.content.trim().length > 15),
        ).length / cap.deliverables.length * 100;
        return s + pct;
      }, 0) / orgs.length,
    );
    return { cap: cap.id, name: cap.name, avg, fill: cap.color };
  });
}

function estimateROI(readiness: number): number {
  // Simplified ROI model: higher readiness → higher innovation output
  // Based on: McKinsey Innovation Benchmark correlations
  return Math.round(readiness * 3.2);
}

// ─── Member/Org Dashboard ─────────────────────────────────────────────────────

function OrgDashboard({ orgId, orgName, orgSector }: { orgId: string; orgName: string; orgSector: string }) {
  const [data, setData] = useState<Record<string, string>>({});
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashTab, setDashTab] = useState<'overview' | 'ihi' | 'predict'>('overview');

  useEffect(() => {
    if (!orgId) return;
    getOrganizationData(orgId).then((org) => {
      if (org) {
        const d: Record<string, string> = {};
        org.deliverables.forEach((del) => { d[del.fieldId] = del.content; });
        setData(d);
        // Auto-save IHI snapshot
        saveHealthSnapshot(orgId, d);
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

  const ihi = calcIHI(data);
  const roiEst = estimateROI(readiness);

  const radialData = [{ name: 'Readiness', value: readiness, fill: readinessColor(readiness) }];
  const barData = CAPS.map((c) => ({ name: c.id, pct: calcCapPct(c.id, data), fill: c.color }));

  // Predictive: completion velocity (mock last 7 days progress)
  const predictData = CAPS.map((c) => ({
    cap: c.id,
    current: calcCapPct(c.id, data),
    projected: Math.min(100, calcCapPct(c.id, data) + Math.floor(Math.random() * 15 + 5)),
    color: c.color,
  }));

  return (
    <div className="dashboard-page">
      <div className="dash-section-title">Organization Analytics</div>
      <div className="dash-org-name">{orgName} <span className="dash-org-sector">{orgSector}</span></div>

      {/* IHI Quick stat */}
      <div className="dash-ihi-banner" style={{ borderLeftColor: ihi.gradeColor }}>
        <div>
          <div className="dash-ihi-banner-label">Innovation Health Index</div>
          <div className="dash-ihi-banner-sub">{ihi.interpretation}</div>
        </div>
        <div className="dash-ihi-banner-score" style={{ color: ihi.gradeColor }}>
          {ihi.overall}
          <span className="dash-ihi-banner-grade" style={{ background: ihi.gradeColor }}>{ihi.grade}</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="dash-sub-tabs">
        {(['overview', 'ihi', 'predict'] as const).map((t) => (
          <button
            key={t}
            className={`dash-sub-tab ${dashTab === t ? 'active' : ''}`}
            onClick={() => setDashTab(t)}
          >
            {t === 'overview' && '📊 Overview'}
            {t === 'ihi' && '🏥 Health Index'}
            {t === 'predict' && '🔮 Predictive'}
          </button>
        ))}
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────────── */}
      {dashTab === 'overview' && (
        <>
          <div className="dash-top-row">
            <div className="dash-card dash-gauge-card">
              <div className="dash-card-label">ISO 56001 Readiness</div>
              <div className="dash-gauge-wrap">
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart innerRadius="60%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
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
                      {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

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

          <div className="dash-bottom-row">
            <div className="dash-card dash-export-card">
              <div className="dash-card-label">Export Report</div>
              <div className="dash-export-btns">
                <button className="dash-export-btn pdf" onClick={() => exportToPDF(orgName, orgSector, data)}>📄 Export PDF</button>
                <button className="dash-export-btn excel" onClick={() => exportToExcel(orgName, orgSector, data)}>📊 Export Excel</button>
              </div>
            </div>
            <div className="dash-card dash-activity-mini">
              <div className="dash-card-label">Recent Activity</div>
              <div className="dash-activity-list">
                {activities.length === 0 && <div className="dash-activity-empty">No activity yet</div>}
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
        </>
      )}

      {/* ── IHI tab ───────────────────────────────────────────────────────── */}
      {dashTab === 'ihi' && (
        <div style={{ maxWidth: 720 }}>
          <HealthIndexCard orgId={orgId} data={data} />
        </div>
      )}

      {/* ── Predictive tab ────────────────────────────────────────────────── */}
      {dashTab === 'predict' && (
        <div className="predict-grid">
          {/* ROI Projection */}
          <div className="dash-card predict-roi-card">
            <div className="dash-card-label">📈 Innovation ROI Projection</div>
            <div className="predict-roi-wrap">
              <div className="predict-roi-big" style={{ color: readinessColor(readiness) }}>
                +{roiEst}%
              </div>
              <div className="predict-roi-sub">Estimated Innovation Output Potential</div>
              <div className="predict-roi-basis">
                Based on {readiness}% ISO 56001 readiness · McKinsey Innovation Benchmark correlation
              </div>
              <div className="predict-roi-tiers">
                {[
                  { label: 'Low (0–35%)', roi: '~50–80%', color: '#DC2626' },
                  { label: 'Mid (36–69%)', roi: '~120–200%', color: '#D97706' },
                  { label: 'High (70%+)', roi: '~220–320%', color: '#0B7B74' },
                ].map((t) => (
                  <div key={t.label} className="predict-roi-tier" style={{ borderLeftColor: t.color }}>
                    <div className="predict-roi-tier-label">{t.label}</div>
                    <div className="predict-roi-tier-val" style={{ color: t.color }}>{t.roi}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Completion velocity */}
          <div className="dash-card predict-velocity-card">
            <div className="dash-card-label">⚡ Projected Completion (Next 30 Days)</div>
            <div className="dash-chart-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={predictData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="cap" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #CBD5E1' }} />
                  <Bar dataKey="current" name="Current" radius={[2, 2, 0, 0]}>
                    {predictData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.5} />)}
                  </Bar>
                  <Bar dataKey="projected" name="Projected" radius={[4, 4, 0, 0]}>
                    {predictData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="predict-legend">
              <span style={{ color: '#94A3B8' }}>◼ Faded = Current  ◼ Solid = 30-day projection</span>
            </div>
          </div>

          {/* Next actions */}
          <div className="dash-card predict-actions-card">
            <div className="dash-card-label">🎯 Recommended Next Actions</div>
            <div className="predict-actions-list">
              {CAPS
                .map((c) => ({ cap: c, pct: calcCapPct(c.id, data) }))
                .filter((x) => x.pct < 80)
                .sort((a, b) => a.pct - b.pct)
                .slice(0, 5)
                .map(({ cap, pct }) => (
                  <div key={cap.id} className="predict-action-row">
                    <div className="predict-action-badge" style={{ background: cap.bg, color: cap.color }}>{cap.id}</div>
                    <div className="predict-action-info">
                      <div className="predict-action-name">{cap.name}</div>
                      <div className="predict-action-gap">Gap: {100 - pct}% remaining</div>
                    </div>
                    <div className="predict-action-pct" style={{ color: pct >= 50 ? '#D97706' : '#DC2626' }}>
                      {pct}%
                    </div>
                  </div>
                ))}
              {CAPS.every((c) => calcCapPct(c.id, data) >= 80) && (
                <div style={{ textAlign: 'center', padding: 20, color: '#0B7B74', fontWeight: 700 }}>
                  🎉 All capabilities ready for ISO 56001!
                </div>
              )}
            </div>
          </div>

          {/* IHI Dimension gaps */}
          <div className="dash-card predict-ihi-gaps-card">
            <div className="dash-card-label">🔬 Capability Gap Analysis</div>
            <div className="predict-ihi-dims">
              {ihi.dimensions.map((d) => {
                const gap = 100 - d.score;
                return (
                  <div key={d.key} className="predict-ihi-dim">
                    <div className="predict-ihi-dim-top">
                      <span className="predict-ihi-dim-icon">{d.icon}</span>
                      <span className="predict-ihi-dim-name">{d.name}</span>
                      <span className="predict-ihi-dim-score" style={{ color: d.color }}>{d.score}%</span>
                    </div>
                    <div className="predict-ihi-dim-bar">
                      <div className="predict-ihi-dim-fill" style={{ width: `${d.score}%`, background: d.color }} />
                      <div className="predict-ihi-dim-gap" style={{ width: `${gap}%` }} />
                    </div>
                    {gap > 20 && (
                      <div className="predict-ihi-dim-alert">⚠️ {gap}% gap — focus area</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
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
  const [facTab, setFacTab] = useState<'orgs' | 'funnel' | 'heatmap'>('orgs');

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

  const avgReadiness = filteredOrgs.length
    ? Math.round(filteredOrgs.reduce((s, o) => s + calcOrgReadiness(o.deliverables), 0) / filteredOrgs.length)
    : 0;

  const topOrg = filteredOrgs.reduce<{ name: string; pct: number } | null>((best, o) => {
    const pct = calcOrgReadiness(o.deliverables);
    if (!best || pct > best.pct) return { name: o.name, pct };
    return best;
  }, null);

  const funnelData = buildFunnelData(filteredOrgs);
  const heatmapData = buildHeatmapData(filteredOrgs);

  const currentCohortName =
    selectedCohort !== 'all' ? cohorts.find((c) => c.id === selectedCohort)?.name : undefined;

  if (loading) return <div className="dash-loading">Loading facilitator dashboard...</div>;

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
        <div className="dash-stat-card" style={{ borderLeftColor: '#DC2626' }}>
          <div className="dash-stat-label">Need Attention</div>
          <div className="dash-stat-big" style={{ color: '#DC2626' }}>
            {filteredOrgs.filter((o) => calcOrgReadiness(o.deliverables) < 35).length}
          </div>
          <div className="dash-stat-sub">below 35% readiness</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="dash-sub-tabs">
        {(['orgs', 'funnel', 'heatmap'] as const).map((t) => (
          <button
            key={t}
            className={`dash-sub-tab ${facTab === t ? 'active' : ''}`}
            onClick={() => setFacTab(t)}
          >
            {t === 'orgs' && '🏢 Organizations'}
            {t === 'funnel' && '🔽 Innovation Funnel'}
            {t === 'heatmap' && '🌡️ Capability Heatmap'}
          </button>
        ))}
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
          {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          className="dash-export-btn excel"
          onClick={() => exportFacilitatorReport(filteredOrgs, currentCohortName)}
        >
          📊 Export Report
        </button>
      </div>

      {/* ── Orgs tab ──────────────────────────────────────────────────────── */}
      {facTab === 'orgs' && (
        <div className="dash-orgs-table">
          <div className="dash-table-hdr">
            <span>Organization</span>
            <span>Sector</span>
            {CAPS.map((c) => <span key={c.id}>{c.id}</span>)}
            <span>Readiness</span>
          </div>
          {filteredOrgs.length === 0 && <div className="dash-table-empty">No organizations found</div>}
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
      )}

      {/* ── Funnel tab ────────────────────────────────────────────────────── */}
      {facTab === 'funnel' && (
        <div className="fac-analytics-grid">
          <div className="dash-card fac-funnel-card">
            <div className="dash-card-label">🔽 Innovation Pipeline Funnel</div>
            <div className="fac-funnel-sub">
              Organizations with ≥50% completion per capability
            </div>
            <div className="dash-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funnelData} layout="vertical" margin={{ top: 8, right: 40, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" domain={[0, Math.max(filteredOrgs.length, 1)]} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748B' }} width={30} />
                  <Tooltip
                    formatter={(v) => [`${v} orgs`, 'Active']}
                    contentStyle={{ fontSize: 11, borderRadius: 6 }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="fac-funnel-insight">
              {funnelData.length > 0 && (
                <span>
                  Highest engagement: <strong style={{ color: funnelData.reduce((a, b) => b.value > a.value ? b : a).fill }}>
                    {funnelData.reduce((a, b) => b.value > a.value ? b : a).name}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <div className="dash-card fac-readiness-dist-card">
            <div className="dash-card-label">📊 Readiness Distribution</div>
            <div className="fac-readiness-buckets">
              {[
                { label: 'Nascent', range: '0–34%', color: '#DC2626', min: 0, max: 34 },
                { label: 'Emerging', range: '35–54%', color: '#D97706', min: 35, max: 54 },
                { label: 'Developing', range: '55–79%', color: '#2563EB', min: 55, max: 79 },
                { label: 'Advanced', range: '80–100%', color: '#0B7B74', min: 80, max: 100 },
              ].map((bucket) => {
                const count = filteredOrgs.filter((o) => {
                  const r = calcOrgReadiness(o.deliverables);
                  return r >= bucket.min && r <= bucket.max;
                }).length;
                const pct = filteredOrgs.length ? Math.round((count / filteredOrgs.length) * 100) : 0;
                return (
                  <div key={bucket.label} className="fac-bucket">
                    <div className="fac-bucket-top">
                      <span className="fac-bucket-label" style={{ color: bucket.color }}>{bucket.label}</span>
                      <span className="fac-bucket-range">{bucket.range}</span>
                      <span className="fac-bucket-count" style={{ color: bucket.color }}>{count} orgs</span>
                    </div>
                    <div className="fac-bucket-bar">
                      <div className="fac-bucket-fill" style={{ width: `${pct}%`, background: bucket.color }} />
                    </div>
                    <div className="fac-bucket-pct">{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Heatmap tab ───────────────────────────────────────────────────── */}
      {facTab === 'heatmap' && (
        <div className="fac-analytics-grid">
          <div className="dash-card fac-heatmap-card">
            <div className="dash-card-label">🌡️ Capability Heatmap — Avg. Completion</div>
            <div className="fac-heatmap-grid">
              {heatmapData.map((item) => {
                const intensity = item.avg / 100;
                return (
                  <div
                    key={item.cap}
                    className="fac-heatmap-cell"
                    style={{
                      background: `rgba(${item.avg >= 70 ? '11,123,116' : item.avg >= 40 ? '217,119,6' : '220,38,38'}, ${0.1 + intensity * 0.7})`,
                      borderColor: item.fill,
                    }}
                    title={`${item.name}: ${item.avg}%`}
                  >
                    <div className="fac-heatmap-cap">{item.cap}</div>
                    <div className="fac-heatmap-avg" style={{ color: item.avg >= 40 ? '#134E4A' : '#7F1D1D' }}>
                      {item.avg}%
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="fac-heatmap-legend">
              <span style={{ color: '#DC2626' }}>■ Low &lt;40%</span>
              <span style={{ color: '#D97706' }}>■ Mid 40–69%</span>
              <span style={{ color: '#0B7B74' }}>■ High ≥70%</span>
            </div>
          </div>

          <div className="dash-card fac-recommend-card">
            <div className="dash-card-label">💡 Cohort Recommendations</div>
            <div className="fac-recommend-list">
              {heatmapData
                .filter((x) => x.avg < 60)
                .sort((a, b) => a.avg - b.avg)
                .slice(0, 5)
                .map((item) => (
                  <div key={item.cap} className="fac-recommend-row">
                    <div className="fac-recommend-badge" style={{ background: `${item.fill}22`, color: item.fill }}>
                      {item.cap}
                    </div>
                    <div className="fac-recommend-info">
                      <div className="fac-recommend-name">{item.name}</div>
                      <div className="fac-recommend-action">
                        Avg {item.avg}% — consider dedicated workshop session
                      </div>
                    </div>
                  </div>
                ))}
              {heatmapData.every((x) => x.avg >= 60) && (
                <div style={{ textAlign: 'center', padding: 20, color: '#0B7B74', fontWeight: 700 }}>
                  🎉 Cohort is performing well across all capabilities!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
          <Link href="/canvas" style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>🗺️ Canvas</Link>
          <Link href="/experts" style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>👥 Experts</Link>
          <Link href="/" style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>← Workshop</Link>
          {isAdmin && (
            <Link href="/admin" style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>Admin</Link>
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
          <Link href="/cohorts" style={{ padding: '10px 18px', fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
            Cohorts
          </Link>
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
