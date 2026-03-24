'use client';

import { useEffect, useState } from 'react';
import { subscribeToActivity, ActivityEntry } from '@/lib/realtimeActions';

function timeAgo(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ACTION_ICONS: Record<string, string> = {
  save: '💾',
  edit: '✏️',
  comment: '💬',
  version: '🔖',
  login: '👤',
  create: '✨',
  default: '📌',
};

function getIcon(action: string): string {
  const key = action.toLowerCase();
  for (const [k, v] of Object.entries(ACTION_ICONS)) {
    if (key.includes(k)) return v;
  }
  return ACTION_ICONS.default;
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
  orgId: string;
  onClose: () => void;
}

export default function ActivityFeed({ orgId, onClose }: Props) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeToActivity(orgId, 20, (data) => {
      setActivities(data);
      setLoading(false);
    });
    return unsub;
  }, [orgId]);

  return (
    <div className="activity-feed">
      <div className="activity-feed-hdr">
        <span className="activity-feed-title">Activity Feed</span>
        <button className="activity-feed-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="activity-feed-body">
        {loading && (
          <div className="activity-loading">Loading activity...</div>
        )}
        {!loading && activities.length === 0 && (
          <div className="activity-empty">No activity yet</div>
        )}
        {activities.map((a, idx) => (
          <div key={a.id} className="activity-item">
            <div className="activity-timeline-line" />
            <div className="activity-avatar">{getInitials(a.displayName)}</div>
            <div className="activity-content">
              <div className="activity-row">
                <span className="activity-icon">{getIcon(a.action)}</span>
                <span className="activity-user">{a.displayName}</span>
                <span className="activity-action">{a.action}</span>
                <span className="activity-target">{a.target}</span>
              </div>
              {a.detail && (
                <div className="activity-detail">{a.detail}</div>
              )}
              <div className="activity-time">{timeAgo(a.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
