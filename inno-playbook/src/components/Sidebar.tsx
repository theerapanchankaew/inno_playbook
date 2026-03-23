"use client";

import { useState } from 'react';
import { CAPS } from '@/lib/data';

export default function Sidebar({
  activeCap,
  setActiveCap,
  orgName,
  orgSector,
  onSaveOrg,
  data,
  onShowMatrix,
  onShowPlaybook
}: any) {
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({1:true, 2:false, 3:false});

  const toggleDay = (d: number) => {
    setOpenDays(prev => ({...prev, [d]: !prev[d]}));
  };

  const capPct = (id: string) => {
    const c = CAPS.find(x => x.id === id); 
    if(!c) return 0;
    const filled = c.deliverables.filter(d => (data[d.id] || '').trim().length > 15).length;
    return Math.round((filled / c.deliverables.length) * 100);
  };

  const dayColors = ['d1', 'd2', 'd3'];
  const dayMeta = [
    'Innovation as Value Creation System',
    'Decision Architecture & Portfolio',
    'Sustainable Capability & ISO 56001'
  ];

  const currentCap = CAPS.find(c => c.id === activeCap) || CAPS[0];

  return (
    <div className="sidebar">
      <div className="sidebar-scroll">
        <div className="gps-banner">
          <div className="gps-now-label"><span className="gps-dot"></span>NOW — กำลังทำ</div>
          <div className="gps-task">{currentCap.gps.task}</div>
          <div className="gps-instruction">{currentCap.gps.instr}</div>
          <div className="gps-timer-row">
            <span className="gps-timer">{currentCap.gps.timer}</span>
            <span className="gps-step-badge">{currentCap.gps.step}</span>
          </div>
        </div>

        <div className="org-section">
          <div className="sidebar-label">Organization Profile</div>
          <div className="org-card">
            <input 
              className="org-inp" 
              placeholder="ชื่อองค์กร / Organization Name" 
              value={orgName}
              onChange={(e) => onSaveOrg(e.target.value, orgSector)}
            />
            <input 
              className="org-sub" 
              placeholder="ประเภทธุรกิจ / Sector" 
              value={orgSector}
              onChange={(e) => onSaveOrg(orgName, e.target.value)}
            />
          </div>
        </div>

        {[1, 2, 3].map(d => {
          const caps = CAPS.filter(c => c.day === d);
          const isOpen = openDays[d];
          
          return (
            <div key={d} className="day-sec">
              <div className="day-hdr" onClick={() => toggleDay(d)}>
                <div>
                  <div className={`day-title ${dayColors[d-1]}`}>DAY {d}</div>
                  <div className="day-meta">{dayMeta[d-1]}</div>
                </div>
                <span className={`day-chev ${isOpen ? 'open' : ''}`}>▶</span>
              </div>
              
              {isOpen && (
                <div className="day-caps">
                  {caps.map(c => {
                    const p = capPct(c.id);
                    return (
                      <button 
                        key={c.id}
                        className={`cap-btn ${activeCap === c.id ? 'active' : ''}`} 
                        onClick={() => setActiveCap(c.id)}
                      >
                        <div className="cap-icon" style={{background: `${c.color}22`, color: c.color}}>{c.id}</div>
                        <div style={{flex: 1, minWidth: 0}}>
                          <div className="cap-code-s" style={{color: c.color}}>{c.id}</div>
                          <div className="cap-name-s">{c.name}</div>
                        </div>
                        <div className={`cap-pct ${p > 0 ? 'has' : ''}`}>{p > 0 ? p+'%' : '—'}</div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="sidebar-bot">
        <button className="sb-btn" onClick={onShowMatrix}><span>📋</span>Evidence Matrix</button>
        <button className="sb-btn primary" onClick={onShowPlaybook}><span>📄</span>Preview Innovation Playbook</button>
      </div>
    </div>
  );
}
