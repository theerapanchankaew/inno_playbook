"use client";

import { CAPS } from '@/lib/data';
import UserMenu from '@/components/UserMenu';

export default function Topbar({
  activeCap,
  setActiveCap,
  readinessScore,
  isSaving,
  data,
  onShowPlaybook,
  onPresent
}: any) {
  const capPct = (id: string) => {
    const c = CAPS.find(x => x.id === id);
    if (!c) return 0;
    const filled = c.deliverables.filter(d => (data[d.id] || '').trim().length > 15).length;
    return Math.round((filled / c.deliverables.length) * 100);
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="logo-badge">MASCI · ISO 56001</span>
        <span className="topbar-title">Innovation Playbook Platform</span>
      </div>
      <div className="topbar-right">
        <div className="cap-dots">
          {CAPS.map(c => {
            const p = capPct(c.id);
            const cls = p >= 80 ? 'done' : p > 0 ? 'partial' : '';
            return (
              <div
                key={c.id}
                className={`cap-dot ${cls} ${activeCap === c.id ? 'active' : ''}`}
                onClick={() => setActiveCap(c.id)}
                title={`${c.name}: ${p}%`}
              >
                {c.id}
              </div>
            );
          })}
        </div>
        <button className="present-btn" onClick={onPresent}>▶ Present</button>
        <div className="readiness-pill" onClick={onShowPlaybook}>
          <span className="readiness-label">ISO READINESS</span>
          <span className="readiness-score">{readinessScore}%</span>
        </div>
        <span className={`save-ind ${isSaving ? 'show' : ''}`}>✓ Saved</span>

        {/* User Avatar & Dropdown */}
        <UserMenu />
      </div>
    </div>
  );
}
