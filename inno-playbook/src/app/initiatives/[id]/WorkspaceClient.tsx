'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { CAPS } from '@/lib/data';
import { saveInitiativeDeliverable, calcInitiativeReadiness } from '@/lib/actions';
import { exportToPDF, exportToExcel } from '@/lib/exportActions';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToInitiativeDeliverables,
  setPresence,
  clearPresence,
  logActivity,
  saveVersion,
} from '@/lib/realtimeActions';
import {
  getInitiative,
  Initiative,
  STATUS_META,
  TYPE_META,
  updateInitiativeProgress,
} from '@/lib/initiativeActions';
import { getUserOrgId } from '@/lib/authActions';
import { ROUTES } from '@/lib/routes';
import Workspace from '@/components/Workspace';
import CommentsPanel from '@/components/CommentsPanel';
import VersionHistory from '@/components/VersionHistory';
import PresenceBar from '@/components/PresenceBar';
import NotificationBell from '@/components/NotificationBell';
import UserMenu from '@/components/UserMenu';
import GlobalNav from '@/components/GlobalNav';

export default function InitiativeWorkspacePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const initiativeId = params?.id as string;

  const [initiative,    setInitiative]    = useState<Initiative | null>(null);
  const [orgId,         setOrgId]         = useState<string | null>(null);
  const [activeCap,     setActiveCap]     = useState('C1');
  const [activeTab,     setActiveTab]     = useState('workshop');
  const [data,          setData]          = useState<Record<string, string>>({});
  const [isSaving,      setIsSaving]      = useState(false);
  const [pageReady,     setPageReady]     = useState(false);

  const [commentFieldId,    setCommentFieldId]    = useState<string | null>(null);
  const [commentFieldLabel, setCommentFieldLabel] = useState('');
  const [versionFieldId,    setVersionFieldId]    = useState<string | null>(null);
  const [versionFieldLabel, setVersionFieldLabel] = useState('');

  const prevContentRef = useRef<Record<string, string>>({});

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.replace(ROUTES.AUTH.LOGIN);
  }, [user, authLoading, router]);

  // ── Load initiative + org ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !initiativeId) return;
    const init = async () => {
      const [initative, oid] = await Promise.all([
        getInitiative(initiativeId),
        getUserOrgId(user.uid),
      ]);
      if (!initative) { router.replace(ROUTES.INITIATIVES); return; }
      setInitiative(initative);
      setOrgId(oid ?? user.uid);
      setPageReady(true);
    };
    init();
  }, [user, initiativeId, router]);

  // ── Real-time deliverables ────────────────────────────────────────────────
  useEffect(() => {
    if (!initiativeId) return;
    const unsub = subscribeToInitiativeDeliverables(initiativeId, (rt) => {
      setData(prev => ({ ...prev, ...rt }));
      prevContentRef.current = { ...prevContentRef.current, ...rt };
    });
    return unsub;
  }, [initiativeId]);

  // ── Presence ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initiativeId || !user) return;
    const name = profile?.displayName || user.displayName || 'User';
    setPresence(initiativeId, user.uid, name, activeCap).catch(() => null);
    return () => { clearPresence(initiativeId, user.uid).catch(() => null); };
  }, [initiativeId, user, profile]);

  useEffect(() => {
    if (!initiativeId || !user) return;
    const name = profile?.displayName || user.displayName || 'User';
    setPresence(initiativeId, user.uid, name, activeCap).catch(() => null);
  }, [activeCap, initiativeId, user, profile]);

  // ── Save deliverable ──────────────────────────────────────────────────────
  const handleFieldChange = async (capId: string, fieldId: string, content: string) => {
    if (!user || !initiativeId || !orgId) return;
    setData(prev => ({ ...prev, [fieldId]: content }));
    setIsSaving(true);

    await saveInitiativeDeliverable(initiativeId, orgId, capId, fieldId, content);

    const displayName = profile?.displayName || user.displayName || 'User';
    const cap = CAPS.find(c => c.id === capId);
    const deliverable = cap?.deliverables.find(d => d.id === fieldId);
    logActivity(initiativeId, user.uid, displayName, 'save',
      `${capId}: ${deliverable?.lbl || fieldId}`).catch(() => null);

    const prev = prevContentRef.current[fieldId] || '';
    if (Math.abs(content.length - prev.length) > 30 && content.trim().length > 10) {
      saveVersion(initiativeId, fieldId, content, user.uid, displayName).catch(() => null);
      prevContentRef.current[fieldId] = content;
    }

    const readiness = calcInitiativeReadiness({ ...data, [fieldId]: content }, CAPS);
    updateInitiativeProgress(initiativeId, readiness).catch(() => null);

    setTimeout(() => setIsSaving(false), 1200);
  };

  const handleRestoreVersion = async (fieldId: string, content: string) => {
    const cap = CAPS.find(c => c.deliverables.some(d => d.id === fieldId));
    if (!cap) return;
    await handleFieldChange(cap.id, fieldId, content);
    setVersionFieldId(null);
  };

  const readiness = calcInitiativeReadiness(data, CAPS);
  const sm = initiative ? STATUS_META[initiative.status] : null;
  const tm = initiative ? TYPE_META[initiative.type] : null;
  const versionDeliverable = versionFieldId
    ? CAPS.flatMap(c => c.deliverables).find(d => d.id === versionFieldId)
    : null;

  // ── Loading screen ────────────────────────────────────────────────────────
  if (authLoading || !pageReady) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', background: 'var(--navy)', gap: 16,
      }}>
        <span className="logo-badge" style={{ fontSize: 12 }}>MASCI · ISO 56001</span>
        <div style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 12 }}>
          กำลังโหลด Initiative Workspace...
        </div>
      </div>
    );
  }

  if (!user || !initiative) return null;

  return (
    <div className="layout-root gnav-offset">
      <GlobalNav />

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="topbar-left">
          <Link href={ROUTES.INITIATIVES} className="ws-back-btn">
            ← Initiatives
          </Link>
          <span className="topbar-divider">|</span>
          <span className="logo-badge">MASCI · ISO 56001</span>

          <div className="ws-init-context">
            <span className="ws-init-type">{tm?.emoji} {tm?.label}</span>
            <span className="ws-init-name">{initiative.title}</span>
            <span
              className="ws-init-status"
              style={{ background: sm?.bg, color: sm?.color }}
            >
              {sm?.label}
            </span>
          </div>
        </div>

        <div className="topbar-center">
          <div className="topbar-caps">
            {CAPS.map(c => {
              const pct = Math.round(
                (c.deliverables.filter(d => (data[d.id] || '').trim().length > 15).length
                  / c.deliverables.length) * 100,
              );
              return (
                <button
                  key={c.id}
                  className={`topbar-cap-btn ${activeCap === c.id ? 'active' : ''}`}
                  style={activeCap === c.id ? { borderColor: c.color, color: c.color } : {}}
                  onClick={() => setActiveCap(c.id)}
                  title={c.name}
                >
                  {c.id}
                  {pct > 0 && (
                    <span className="topbar-cap-dot" style={{ background: c.color }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="topbar-right">
          <div className="topbar-readiness">
            <span className="topbar-readiness-num" style={{ color: readiness >= 80 ? 'var(--teal)' : readiness >= 50 ? '#D97706' : '#94A3B8' }}>
              {readiness}%
            </span>
            <span className="topbar-readiness-lbl">Readiness</span>
          </div>

          {isSaving && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#94A3B8' }}>
              💾 saving...
            </span>
          )}

          <button
            className="topbar-icon-btn"
            title="Export PDF — ISO 56001 Readiness Report"
            onClick={() => exportToPDF(initiative.title, initiative.type, data)}
          >
            📄
          </button>
          <button
            className="topbar-icon-btn"
            title="Export Excel"
            onClick={() => exportToExcel(initiative.title, initiative.type, data)}
          >
            📊
          </button>

          {initiativeId && <PresenceBar contextId={initiativeId} />}
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="layout">

        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div className="sidebar-scroll">

            <div className="ws-init-info-card">
              <div className="ws-init-info-label">INNOVATION INITIATIVE</div>
              <div className="ws-init-info-title">{initiative.title}</div>
              {initiative.description && (
                <div className="ws-init-info-desc">{initiative.description}</div>
              )}
              <div className="ws-init-info-meta">
                {initiative.targetDate && <span>📅 {initiative.targetDate}</span>}
                {initiative.ownerName && <span>👤 {initiative.ownerName}</span>}
              </div>

              <div className="ws-init-progress-row">
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
                  ISO 56001 READINESS
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--teal)' }}>
                  {readiness}%
                </span>
              </div>
              <div className="ws-init-progress-bar-wrap">
                <div className="ws-init-progress-bar-fill" style={{ width: `${readiness}%` }} />
              </div>
            </div>

            <div className="sidebar-label" style={{ marginTop: 16 }}>ISO 56001 Capability Areas</div>
            {[1, 2, 3].map(day => {
              const caps = CAPS.filter(c => c.day === day);
              const dayMeta = [
                'Innovation as Value Creation',
                'Decision Architecture & Portfolio',
                'Sustainable Capability & ISO 56001',
              ];
              return (
                <div key={day} className="day-sec">
                  <div className="day-hdr" style={{ cursor: 'default' }}>
                    <div>
                      <div className={`day-title d${day}`}>DAY {day}</div>
                      <div className="day-meta">{dayMeta[day - 1]}</div>
                    </div>
                  </div>
                  <div className="day-caps">
                    {caps.map(c => {
                      const p = Math.round(
                        (c.deliverables.filter(d => (data[d.id] || '').trim().length > 15).length
                          / c.deliverables.length) * 100,
                      );
                      return (
                        <button
                          key={c.id}
                          className={`cap-btn ${activeCap === c.id ? 'active' : ''}`}
                          onClick={() => setActiveCap(c.id)}
                        >
                          <div className="cap-icon" style={{ background: `${c.color}22`, color: c.color }}>{c.id}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="cap-code-s" style={{ color: c.color }}>{c.id}</div>
                            <div className="cap-name-s">{c.name}</div>
                          </div>
                          <div className={`cap-pct ${p > 0 ? 'has' : ''}`}>{p > 0 ? `${p}%` : '—'}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sidebar-bot">
            <Link href={ROUTES.INITIATIVES} className="sb-btn" style={{ textAlign: 'center' }}>
              ← กลับ Initiatives
            </Link>
            <Link href={ROUTES.COMMUNITY} className="sb-btn primary">
              <span>💡</span>Community Space
            </Link>
          </div>
        </div>

        {/* ── Workspace ── */}
        <Workspace
          activeCap={activeCap}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          data={data}
          onFieldChange={handleFieldChange}
          contextId={initiativeId}
          onOpenComments={(fid, flbl) => { setCommentFieldId(fid); setCommentFieldLabel(flbl); }}
          onOpenVersionHistory={(fid, flbl) => { setVersionFieldId(fid); setVersionFieldLabel(flbl); }}
        />
      </div>

      {/* ── Comments Panel ── */}
      {commentFieldId && (
        <CommentsPanel
          orgId={initiativeId}
          fieldId={commentFieldId}
          fieldLabel={commentFieldLabel}
          onClose={() => setCommentFieldId(null)}
        />
      )}

      {/* ── Version History ── */}
      {versionFieldId && (
        <VersionHistory
          orgId={initiativeId}
          fieldId={versionFieldId}
          fieldLabel={versionDeliverable?.lbl || versionFieldLabel}
          currentContent={data[versionFieldId] || ''}
          onRestore={(content: string) => handleRestoreVersion(versionFieldId, content)}
          onClose={() => setVersionFieldId(null)}
        />
      )}
    </div>
  );
}
