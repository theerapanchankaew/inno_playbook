"use client";

import { useState, useEffect } from 'react';
import { CAPS, EVIDENCE } from '@/lib/data';
import { saveOrganization, saveDeliverable, getOrganizationData } from '@/lib/actions';
import Topbar from '@/components/Topbar';
import Sidebar from '@/components/Sidebar';
import Workspace from '@/components/Workspace';
import Modals from '@/components/Modals';

export default function Home() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgSector, setOrgSector] = useState('');
  const [activeCap, setActiveCap] = useState('C1');
  const [activeTab, setActiveTab] = useState('workshop');
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  const [showPresentModal, setShowPresentModal] = useState(false);
  
  // Data State
  const [data, setData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load from localStorage first, then sync DB
  useEffect(() => {
    const localOrgId = localStorage.getItem('innoPB_orgId');
    if (localOrgId) {
      setOrgId(localOrgId);
      loadOrgData(localOrgId);
    }
  }, []);

  const loadOrgData = async (id: string) => {
    const org = await getOrganizationData(id);
    if (org) {
      setOrgName(org.name);
      setOrgSector(org.sector || '');
      const newData: Record<string, string> = {};
      org.deliverables.forEach(d => {
        newData[d.fieldId] = d.content;
      });
      setData(newData);
    }
  };

  const handleSaveOrg = async (name: string, sector: string) => {
    setOrgName(name);
    setOrgSector(sector);
    setIsSaving(true);
    const org = await saveOrganization(orgId, name, sector);
    if (!orgId && org) {
      setOrgId(org.id);
      localStorage.setItem('innoPB_orgId', org.id);
    }
    setTimeout(() => setIsSaving(false), 1600);
  };

  const handleFieldChange = async (capId: string, fieldId: string, content: string) => {
    setData(prev => ({ ...prev, [fieldId]: content }));
    
    if (!orgId) {
      // Create org first if not exists
      const org = await saveOrganization(null, orgName || 'Unnamed Org', orgSector);
      if (org) {
        setOrgId(org.id);
        localStorage.setItem('innoPB_orgId', org.id);
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
    const filled = CAPS.reduce((a, c) => a + c.deliverables.filter(d => (data[d.id] || '').trim().length > 15).length, 0);
    return Math.round((filled / tot) * 100);
  };

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
