"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CAPS } from '@/lib/data';
import { saveOrganization, saveDeliverable, getOrganizationData } from '@/lib/actions';
import { linkOrgToUser, getUserOrgId } from '@/lib/authActions';
import { useAuth } from '@/contexts/AuthContext';
import Topbar from '@/components/Topbar';
import Sidebar from '@/components/Sidebar';
import Workspace from '@/components/Workspace';
import Modals from '@/components/Modals';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
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

  // ── Redirect ถ้า ยัง auth loading หรือ ไม่มี user ───────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  // ── Load org data เมื่อ user ready ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      // 1. ลอง localStorage ก่อน (เร็ว)
      const localOrgId = localStorage.getItem(`innoPB_orgId_${user.uid}`);
      if (localOrgId) {
        setOrgId(localOrgId);
        await loadOrgData(localOrgId);
        setPageReady(true);
        return;
      }

      // 2. ลอง Firestore user profile
      const firestoreOrgId = await getUserOrgId(user.uid);
      if (firestoreOrgId) {
        setOrgId(firestoreOrgId);
        localStorage.setItem(`innoPB_orgId_${user.uid}`, firestoreOrgId);
        await loadOrgData(firestoreOrgId);
        setPageReady(true);
        return;
      }

      // 3. ไม่มี org เลย → รอ user กรอก org name ใน Sidebar
      setPageReady(true);
    };

    init();
  }, [user]);

  const loadOrgData = async (id: string) => {
    const org = await getOrganizationData(id);
    if (org) {
      setOrgName(org.name);
      setOrgSector(org.sector || '');
      const newData: Record<string, string> = {};
      org.deliverables.forEach(d => { newData[d.fieldId] = d.content; });
      setData(newData);
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
      await linkOrgToUser(user.uid, org.id);  // เชื่อม org กับ user
    }
    setTimeout(() => setIsSaving(false), 1600);
  };

  const handleFieldChange = async (capId: string, fieldId: string, content: string) => {
    if (!user) return;
    setData(prev => ({ ...prev, [fieldId]: content }));

    if (!orgId) {
      const org = await saveOrganization(null, orgName || 'Unnamed Org', orgSector);
      if (org) {
        setOrgId(org.id);
        localStorage.setItem(`innoPB_orgId_${user.uid}`, org.id);
        await linkOrgToUser(user.uid, org.id);
        setIsSaving(true);
        await saveDeliverable(org.id, capId, fieldId, content);
        setTimeout(() => setIsSaving(false), 1600);
      }
    } else {
      setIsSaving(true);
      await saveDeliverable(orgId, capId, fieldId, content);
      setTimeout(() => setIsSaving(false), 1600);
    }
  };

  const calculateReadiness = () => {
    const tot = CAPS.reduce((a, c) => a + c.deliverables.length, 0);
    const filled = CAPS.reduce((a, c) =>
      a + c.deliverables.filter(d => (data[d.id] || '').trim().length > 15).length, 0);
    return Math.round((filled / tot) * 100);
  };

  // ── Loading Screen ─────────────────────────────────────────────────────────
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

  return (
    <>
      <Topbar
        activeCap={activeCap}
        setActiveCap={setActiveCap}
        readinessScore={readinessScore}
        isSaving={isSaving}
        data={data}
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
        />

        <Workspace
          activeCap={activeCap}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          data={data}
          onFieldChange={handleFieldChange}
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
    </>
  );
}
