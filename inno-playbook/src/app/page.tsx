"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CAPS } from '@/lib/data';
import { saveOrganization, saveDeliverable, getOrganizationData } from '@/lib/actions';
import { linkOrgToUser, getUserOrgId } from '@/lib/authActions';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToDeliverables,
  setPresence,
  clearPresence,
  logActivity,
  saveVersion,
} from '@/lib/realtimeActions';
import Topbar from '@/components/Topbar';
import Sidebar from '@/components/Sidebar';
import Workspace from '@/components/Workspace';
import Modals from '@/components/Modals';
import CommentsPanel from '@/components/CommentsPanel';
import VersionHistory from '@/components/VersionHistory';

export default function Home() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgSector, setOrgSector] = useState('');
  const [activeCap, setActiveCap] = useState('C1');
  const [activeTab, setActiveTab] = useState('workshop');
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  const [showPresentModal, setShowPresentModal] = useState(false);
  const [data, setData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);

  // Comment panel state
  const [commentFieldId, setCommentFieldId] = useState<string | null>(null);
  const [commentFieldLabel, setCommentFieldLabel] = useState('');

  // Version history state
  const [versionFieldId, setVersionFieldId] = useState<string | null>(null);
  const [versionFieldLabel, setVersionFieldLabel] = useState('');

  // Track previous content for version diffing
  const prevContentRef = useRef<Record<string, string>>({});

  // ── Redirect: authenticated → /initiatives, guest → /auth/login ─────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login');
    } else {
      router.replace('/initiatives');
    }
  }, [user, authLoading, router]);

  // ── Load org data when user ready ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      const localOrgId = localStorage.getItem(`innoPB_orgId_${user.uid}`);
      if (localOrgId) {
        setOrgId(localOrgId);
        await loadOrgData(localOrgId);
        setPageReady(true);
        return;
      }

      const firestoreOrgId = await getUserOrgId(user.uid);
      if (firestoreOrgId) {
        setOrgId(firestoreOrgId);
        localStorage.setItem(`innoPB_orgId_${user.uid}`, firestoreOrgId);
        await loadOrgData(firestoreOrgId);
        setPageReady(true);
        return;
      }

      setPageReady(true);
    };

    init();
  }, [user]);

  // ── Real-time deliverable subscription ───────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeToDeliverables(orgId, (realtimeData) => {
      setData((prev) => ({ ...prev, ...realtimeData }));
    });
    return unsub;
  }, [orgId]);

  // ── Presence: set on mount, clear on unmount ─────────────────────────────────
  useEffect(() => {
    if (!orgId || !user) return;
    const displayName = profile?.displayName || user.displayName || 'User';
    setPresence(orgId, user.uid, displayName, activeCap).catch(() => null);
    return () => {
      clearPresence(orgId, user.uid).catch(() => null);
    };
  }, [orgId, user, profile]);

  // ── Update presence when active CAP changes ──────────────────────────────────
  useEffect(() => {
    if (!orgId || !user) return;
    const displayName = profile?.displayName || user.displayName || 'User';
    setPresence(orgId, user.uid, displayName, activeCap).catch(() => null);
  }, [activeCap, orgId, user, profile]);

  const loadOrgData = async (id: string) => {
    const org = await getOrganizationData(id);
    if (org) {
      setOrgName(org.name);
      setOrgSector(org.sector || '');
      const newData: Record<string, string> = {};
      org.deliverables.forEach(d => { newData[d.fieldId] = d.content; });
      setData(newData);
      prevContentRef.current = { ...newData };
    }
  };

  const handleSaveOrg = async (name: string, sector: string) => {
    if (!user) return;
    setOrgName(name);
    setOrgSector(sector);
    setIsSaving(true);
    const org = await saveOrganization(orgId, name, sector);
    if (!orgId && org) {
      setOrgId(org.id);
      localStorage.setItem(`innoPB_orgId_${user.uid}`, org.id);
      await linkOrgToUser(user.uid, org.id);
    }
    setTimeout(() => setIsSaving(false), 1600);
  };

  const handleFieldChange = async (capId: string, fieldId: string, content: string) => {
    if (!user) return;
    setData(prev => ({ ...prev, [fieldId]: content }));

    let currentOrgId = orgId;

    if (!currentOrgId) {
      const org = await saveOrganization(null, orgName || 'Unnamed Org', orgSector);
      if (org) {
        currentOrgId = org.id;
        setOrgId(org.id);
        localStorage.setItem(`innoPB_orgId_${user.uid}`, org.id);
        await linkOrgToUser(user.uid, org.id);
      }
    }

    if (!currentOrgId) return;

    setIsSaving(true);
    await saveDeliverable(currentOrgId, capId, fieldId, content);

    // Log activity
    const displayName = profile?.displayName || user.displayName || 'User';
    const cap = CAPS.find(c => c.id === capId);
    const deliverable = cap?.deliverables.find(d => d.id === fieldId);
    logActivity(
      currentOrgId,
      user.uid,
      displayName,
      'save',
      `${capId}: ${deliverable?.lbl || fieldId}`,
    ).catch(() => null);

    // Save version if significant change
    const prev = prevContentRef.current[fieldId] || '';
    const diff = Math.abs(content.length - prev.length);
    if (diff > 30 && content.trim().length > 10) {
      saveVersion(currentOrgId, fieldId, content, user.uid, displayName).catch(() => null);
      prevContentRef.current[fieldId] = content;
    }

    setTimeout(() => setIsSaving(false), 1600);
  };

  const handleOpenComments = (fieldId: string, fieldLabel: string) => {
    setCommentFieldId(fieldId);
    setCommentFieldLabel(fieldLabel);
  };

  const handleOpenVersionHistory = (fieldId: string, fieldLabel: string) => {
    setVersionFieldId(fieldId);
    setVersionFieldLabel(fieldLabel);
  };

  const handleRestoreVersion = async (fieldId: string, content: string) => {
    const cap = CAPS.find(c => c.deliverables.some(d => d.id === fieldId));
    if (!cap) return;
    await handleFieldChange(cap.id, fieldId, content);
    setVersionFieldId(null);
  };

  const calculateReadiness = () => {
    const tot = CAPS.reduce((a, c) => a + c.deliverables.length, 0);
    const filled = CAPS.reduce((a, c) =>
      a + c.deliverables.filter(d => (data[d.id] || '').trim().length > 15).length, 0);
    return Math.round((filled / tot) * 100);
  };

  // ── Loading Screen ──────────────────────────────────────────────────────────
  if (authLoading || !pageReady) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh',
        background: 'var(--navy)', gap: 16,
      }}>
        <span className="logo-badge" style={{ fontSize: 12 }}>MASCI · ISO 56001</span>
        <div style={{
          color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 12,
          animation: 'pulse 1.5s infinite',
        }}>
          กำลังโหลด Innovation Playbook...
        </div>
      </div>
    );
  }

  if (!user) return null;

  const readinessScore = calculateReadiness();

  // Find deliverable label for version history
  const versionDeliverable = versionFieldId
    ? CAPS.flatMap(c => c.deliverables).find(d => d.id === versionFieldId)
    : null;

  return (
    <div className="layout-root">
      <Topbar
        activeCap={activeCap}
        setActiveCap={setActiveCap}
        readinessScore={readinessScore}
        isSaving={isSaving}
        data={data}
        orgId={orgId}
        orgName={orgName}
        orgSector={orgSector}
        onShowPlaybook={() => setShowPlaybookModal(true)}
        onPresent={() => setShowPresentModal(true)}
      />

      <div className="layout">
        <Sidebar
          activeCap={activeCap}
          setActiveCap={setActiveCap}
          orgName={orgName}
          orgSector={orgSector}
          onSaveOrg={handleSaveOrg}
          data={data}
          onShowMatrix={() => setShowMatrixModal(true)}
          onShowPlaybook={() => setShowPlaybookModal(true)}
          orgId={orgId}
          showActivityFeed={showActivityFeed}
          onToggleActivityFeed={() => setShowActivityFeed(v => !v)}
        />

        <Workspace
          activeCap={activeCap}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          data={data}
          onFieldChange={handleFieldChange}
          orgId={orgId}
          onOpenComments={handleOpenComments}
          onOpenVersionHistory={handleOpenVersionHistory}
        />
      </div>

      <Modals
        showMatrix={showMatrixModal}
        showPlaybook={showPlaybookModal}
        showPresent={showPresentModal}
        onCloseMatrix={() => setShowMatrixModal(false)}
        onClosePlaybook={() => setShowPlaybookModal(false)}
        onClosePresent={() => setShowPresentModal(false)}
        data={data}
        orgName={orgName}
        orgSector={orgSector}
      />

      {/* Comments panel */}
      {commentFieldId && orgId && (
        <CommentsPanel
          orgId={orgId}
          fieldId={commentFieldId}
          fieldLabel={commentFieldLabel}
          onClose={() => setCommentFieldId(null)}
        />
      )}

      {/* Version history modal */}
      {versionFieldId && orgId && (
        <VersionHistory
          orgId={orgId}
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
