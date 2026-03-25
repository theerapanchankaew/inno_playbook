'use client';

import { useEffect, useState, useRef } from 'react';
import { subscribeToPresence, PresenceUser } from '@/lib/realtimeActions';

const AVATAR_COLORS = [
  '#0B7B74', '#2563EB', '#7C3AED', '#DC2626', '#D97706',
  '#059669', '#DB2777', '#0284C7', '#EA580C', '#65A30D',
];

function getColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface Props {
  /** contextId accepts orgId (legacy) or initiativeId (new flow) */
  contextId?: string;
  orgId?: string;
  currentUserId?: string;
}

export default function PresenceBar({ contextId, orgId, currentUserId }: Props) {
  const effectiveId = contextId ?? orgId ?? '';
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const tooltipRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!effectiveId) return;
    const unsub = subscribeToPresence(effectiveId, (u) => {
      setUsers(currentUserId ? u.filter((x) => x.userId !== currentUserId) : u);
    });
    return unsub;
  }, [effectiveId, currentUserId]);

  if (users.length === 0) return null;

  const MAX_VISIBLE = 5;
  const visible = users.slice(0, MAX_VISIBLE);
  const extra = users.length - MAX_VISIBLE;

  const handleMouseEnter = (uid: string, name: string, cap: string) => {
    if (tooltipRef.current) clearTimeout(tooltipRef.current);
    setTooltip(`${name} · ${cap}`);
  };

  const handleMouseLeave = () => {
    tooltipRef.current = setTimeout(() => setTooltip(null), 200);
  };

  return (
    <div className="presence-bar" aria-label="Online users">
      <span className="presence-label">ONLINE</span>
      <div className="presence-avatars">
        {visible.map((u) => (
          <div
            key={u.userId}
            className="presence-avatar"
            style={{ background: getColor(u.userId) }}
            onMouseEnter={() => handleMouseEnter(u.userId, u.displayName, u.activeCap)}
            onMouseLeave={handleMouseLeave}
            aria-label={`${u.displayName} in ${u.activeCap}`}
          >
            {getInitials(u.displayName)}
            <span className="presence-online-dot" />
          </div>
        ))}
        {extra > 0 && (
          <div
            className="presence-avatar presence-extra"
            title={`${extra} more user${extra > 1 ? 's' : ''} online`}
          >
            +{extra}
          </div>
        )}
      </div>
      {tooltip && (
        <div className="presence-tooltip">{tooltip}</div>
      )}
    </div>
  );
}
