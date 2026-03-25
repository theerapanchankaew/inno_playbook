"use client";

import Link from 'next/link';
import { CAPS } from '@/lib/data';
import UserMenu from '@/components/UserMenu';
import PresenceBar from '@/components/PresenceBar';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';

interface TopbarProps {
  activeCap?: string;
  setActiveCap?: (cap: string) => void;
  readinessScore?: number;
  isSaving?: boolean;
  data?: Record<string, string>;
  orgId?: string | null;
  orgName?: string;
  orgSector?: string;
  onShowPlaybook?: () => void;
  onPresent?: () => void;
}

export default function Topbar({
  activeCap = '',
  setActiveCap,
  readinessScore = 0,
  isSaving = false,
  data = {},
  orgId,
  orgName = '',
  orgSector = '',
  onShowPlaybook,
  onPresent,
}: TopbarProps) {
  const { user } = useAuth();

  const capPct = (id: string) => {
    const c = CAPS.find(x => x.id === id);
    if (!c) return 0;
    const filled = c.deliverables.filter(d => (data[d.id] || '').trim().length > 15).length;
    return Math.round((filled / c.deliverables.length) * 100);
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <Link href="/initiatives" className="topbar-home-link">
          <span className="logo-badge">MASCI · ISO 56001</span>
        </Link>
        <span className="topbar-title">Innovation Playbook Platform</span>
      </div>
      <div className="topbar-right">
        {/* Presence bar — online users in same org */}
        {orgId && user && (
          <PresenceBar orgId={orgId} currentUserId={user.uid} />
        )}

        {/* CAP dots — only when in playbook mode */}
        {setActiveCap && (
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
        )}

        {/* Navigation links */}
        <Link href="/initiatives" className="topbar-icon-btn" title="Innovation Initiatives">
          🚀
        </Link>
        <Link href="/canvas" className="topbar-icon-btn" title="Innovation Canvas">
          🗺️
        </Link>
        <Link href="/experts" className="topbar-icon-btn" title="Expert Network">
          👥
        </Link>
        <Link href="/dashboard" className="topbar-icon-btn" title="Dashboard">
          📈
        </Link>

        {onPresent && (
          <button className="present-btn" onClick={onPresent}>▶ Present</button>
        )}
        {onShowPlaybook && (
          <div className="readiness-pill" onClick={onShowPlaybook}>
            <span className="readiness-label">ISO READINESS</span>
            <span className="readiness-score">{readinessScore}%</span>
          </div>
        )}
        <span className={`save-ind ${isSaving ? 'show' : ''}`}>✓ Saved</span>

        {/* Notification bell */}
        <NotificationBell />

        {/* User Avatar & Dropdown */}
        <UserMenu />
      </div>
    </div>
  );
}
