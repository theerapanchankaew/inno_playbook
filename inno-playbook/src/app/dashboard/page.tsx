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
import { exportFacilitatorReport, exportInitiativesToPDF, exportInitiativesToExcel, InitiativeExportRow } from '@/lib/exportActions';
import { CAPS } from '@/lib/data';
import {
  Initiative, STATUS_META, PRIORITY_META, TYPE_META,
  subscribeToInitiatives,
} from '@/lib/initiativeActions';
import UserMenu from '@/components/UserMenu';
import GlobalNav from '@/components/GlobalNav';

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

// ─── Initiatives Overview (cross-workspace portfolio dashboard) ───────────────

function InitiativesOverview({ orgId, orgName, orgSector }: { orgId: string; orgName: string; orgSector: string }) {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [activities,  setActivities]  = useState<ActivityEntry[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    const unsub = subscribeToInitiatives(orgId, items => {
      setInitiatives(items);
      setLoading(false);
    });
    return unsub;
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeToActivity(orgId, 15, setActivities);
    return unsub;
  }, [orgId]);

  if (loading) return <div className="dash-loading">กำลังโหลดข้อมูล Portfolio...</div>;

  const total    = initiatives.length;
  const active   = initiatives.filter(i => i.status === 'active').length;
  const approved = initiatives.filter(i => i.status === 'approved').length;
  const avgProg  = total ? Math.round(initiatives.reduce((s, i) => s + i.overallProgress, 0) / total) : 0;

  // CAP coverage: avg readiness of initiatives linked to each CAP
  const capData = CAPS.map(cap => {
    const linked = initiatives.filter(i => i.linkedCapId === cap.id);
    const avg = linked.length ? Math.round(linked.reduce((s, i) => s + i.overallProgress, 0) / linked.length) : 0;
    return { ...cap, linked: linked.length, avg };
  });

  // Bar chart: progress per initiative
  const barData = initiatives.map(i => ({
    name: i.title.length > 18 ? i.title.slice(0, 18) + '…' : i.title,
    progress: i.overallProgress,
    fill: STATUS_META[i.status]?.color ?? '#94A3B8',
  }));

  // ROI projection based on avg progress
  const roiEst = Math.round(avgProg * 3.2);

  // Export rows helper
  const toRow = (i: Initiative): InitiativeExportRow => ({
    id: i.id, title: i.title,
    type: TYPE_META[i.type]?.label ?? i.type,
    status: STATUS_META[i.status]?.label ?? i.status,
    priority: PRIORITY_META[i.priority]?.label ?? i.priority,
    overallProgress: i.overallProgress,
    targetDate: i.targetDate, budget: i.budget, ownerName: i.ownerName,
    tags: i.tags ?? [], linkedCapId: i.linkedCapId,
    milestonesDone: i.milestones?.filter(m => m.completed).length ?? 0,
    milestonesTotal: i.milestones?.length ?? 0,
  });

  if (total === 0) {
    return (
      <div className="dashboard-page">
        <div className="dash-section-title">Innovation Portfolio Overview</div>
        <div className="dash-org-name">{orgName} <span className="dash-org-sector">{orgSector}</span></div>
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
          <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 18 }}>ยังไม่มี Innovation Initiative</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <Link href="/initiatives" style={{ color: 'var(--teal)' }}>สร้าง Initiative แรก</Link>
            {' '}เพื่อเริ่มต้น Innovation Portfolio
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dash-section-title">Innovation Portfolio Overview</div>
      <div className="dash-org-name">{orgName} <span className="dash-org-sector">{orgSector}</span></div>

      {/* ── Stats bar ── */}
      <div className="dash-top-row" style={{ gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Workspaces', val: String(total),    color: 'var(--navy)' },
          { label: 'Active',           val: String(active),   color: '#0B7B74'     },
          { label: 'Approved',         val: String(approved), color: '#2563EB'     },
          { label: 'Avg ISO Readiness',val: `${avgProg}%`,    color: readinessColor(avgProg) },
          { label: 'Est. ROI Potential',val: `+${roiEst}%`,   color: '#7C3AED'     },
        ].map(s => (
          <div key={s.label} className="dash-card" style={{ flex: 1, textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: 'var(--mono)' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="dash-top-row">
        <div className="dash-card dash-gauge-card">
          <div className="dash-card-label">🎯 Avg ISO Readiness — ทุก Workspace</div>
          <div className="dash-gauge-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart innerRadius="60%" outerRadius="90%"
                data={[{ name: 'Readiness', value: avgProg, fill: readinessColor(avgProg) }]}
                startAngle={180} endAngle={0}>
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#E2E8F0' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="dash-gauge-center">
              <div className="dash-gauge-pct" style={{ color: readinessColor(avgProg) }}>{avgProg}%</div>
              <div className="dash-gauge-lbl">Avg Progress</div>
            </div>
          </div>
        </div>

        <div className="dash-card dash-bar-card">
          <div className="dash-card-label">📊 ISO Readiness — แต่ละ Workspace</div>
          <div className="dash-chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'ISO Readiness']}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #CBD5E1' }}
                />
                <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Workspace list ── */}
      <div className="dash-card" style={{ marginBottom: 16 }}>
        <div className="dash-card-label">🗂 All Workspaces — ISO 56001 Progress</div>
        <div style={{ marginTop: 12 }}>
          {initiatives.map(i => {
            const sm = STATUS_META[i.status];
            const pm = PRIORITY_META[i.priority];
            const tm = TYPE_META[i.type];
            return (
              <div key={i.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ flex: 3, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)', marginBottom: 5 }}>
                    {tm.emoji} {i.title}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, background: sm.bg, color: sm.color, borderRadius: 4, padding: '1px 7px' }}>{sm.label}</span>
                    <span style={{ fontSize: 10, background: pm.bg, color: pm.color, borderRadius: 4, padding: '1px 7px' }}>{pm.label}</span>
                    {i.linkedCapId && <span style={{ fontSize: 10, background: '#F1F5F9', color: '#475569', borderRadius: 4, padding: '1px 7px' }}>🗺 {i.linkedCapId}</span>}
                  </div>
                </div>
                <div style={{ flex: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>ISO Readiness</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: readinessColor(i.overallProgress), fontFamily: 'var(--mono)' }}>{i.overallProgress}%</span>
                  </div>
                  <div style={{ background: '#E2E8F0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${i.overallProgress}%`, height: '100%', background: readinessColor(i.overallProgress), borderRadius: 4, transition: 'width .4s' }} />
                  </div>
                </div>
                <Link
                  href={`/initiatives/${i.id}`}
                  style={{ fontSize: 11, background: 'var(--teal)', color: 'white', padding: '6px 14px', borderRadius: 6, textDecoration: 'none', whiteSpace: 'nowrap', fontWeight: 600 }}
                >
                  🗺 Open Workspace
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CAP Coverage heatmap ── */}
      <div className="dash-cap-grid">
        {capData.map(cap => (
          <div key={cap.id} className="dash-cap-card">
            <div className="dash-cap-icon" style={{ background: cap.bg, color: cap.color }}>{cap.id}</div>
            <div className="dash-cap-info">
              <div className="dash-cap-name">{cap.name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
                {cap.linked} workspace{cap.linked !== 1 ? 's' : ''} linked
              </div>
              <div className="dash-cap-bar-wrap">
                <div className="dash-cap-bar-fill" style={{ width: `${cap.avg}%`, background: cap.color }} />
              </div>
            </div>
            <div className="dash-cap-pct" style={{ color: cap.color }}>{cap.avg}%</div>
          </div>
        ))}
      </div>

      {/* ── Export + Activity ── */}
      <div className="dash-bottom-row">
        <div className="dash-card dash-export-card">
          <div className="dash-card-label">📋 Export Portfolio Report</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
            รายงานภาพรวม Innovation Portfolio ทุก Workspace<br />
            รวม {total} workspace · avg readiness {avgProg}%
          </div>
          <div className="dash-export-btns">
            <button
              className="dash-export-btn pdf"
              onClick={() => exportInitiativesToPDF(initiatives.map(toRow), orgName || 'Innovation Portfolio')}
            >
              📄 Export PDF
            </button>
            <button
              className="dash-export-btn excel"
              onClick={() => exportInitiativesToExcel(initiatives.map(toRow), orgName || 'Innovation Portfolio')}
            >
              📊 Export Excel
            </button>
          </div>
        </div>
        <div className="dash-card dash-activity-mini">
          <div className="dash-card-label">⚡ Recent Activity</div>
          <div className="dash-activity-list">
            {activities.length === 0 && <div className="dash-activity-empty">ยังไม่มี activity</div>}
            {activities.slice(0, 10).map((a) => (
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
    if (!user || authLoading) return;
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
    } else if (profile?.role === 'super_admin') {
      // super_admin ไม่ต้องมี org — ใช้ uid เป็น namespace
      setOrgId(user.uid);
    } else {
      // ผู้ใช้ทั่วไปที่ยังไม่มี org — ดึงจาก Firestore
      import('@/lib/authActions').then(({ getUserOrgId }) =>
        getUserOrgId(user.uid).then(id => {
          if (id) {
            setOrgId(id);
            localStorage.setItem(`innoPB_orgId_${user.uid}`, id);
            getOrganizationData(id).then(org => {
              if (org) { setOrgName(org.name); setOrgSector(org.sector || ''); }
            });
          }
        })
      );
    }
  }, [user, authLoading, profile]);

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
            📊 Dashboard
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/canvas" style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>🗺️ Canvas</Link>
          <Link href="/experts" style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>👥 Experts</Link>
          <Link href="/initiatives" style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>🚀 Initiatives</Link>
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
            <Link href="/dashboard?tab=org" style={{ padding: '10px 18px', fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
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
          <InitiativesOverview orgId={orgId} orgName={orgName} orgSector={orgSector} />
        ) : (
          <div className="dash-no-org">
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div style={{ color: 'var(--navy)', fontWeight: 700, fontSize: 18 }}>No organization linked</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
              ไปที่{' '}
              <Link href="/initiatives" style={{ color: 'var(--teal)' }}>Initiatives</Link>
              {' '}เพื่อตั้งค่าองค์กรของคุณก่อน
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
