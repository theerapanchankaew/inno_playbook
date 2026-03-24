'use client';

import { useEffect, useState, useRef } from 'react';
import {
  subscribeToNotifications,
  markNotificationRead,
  AppNotification,
} from '@/lib/realtimeActions';
import { useAuth } from '@/contexts/AuthContext';

function timeAgo(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_ICONS: Record<string, string> = {
  comment: '💬',
  mention: '@',
  assignment: '📋',
  system: '⚡',
  default: '🔔',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return unsub;
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notifications.filter((n) => !n.read).length;

  const handleClick = (n: AppNotification) => {
    if (!user) return;
    if (!n.read) {
      markNotificationRead(user.uid, n.id).catch(() => null);
    }
    if (n.link) {
      window.location.href = n.link;
    }
    setOpen(false);
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadOnes = notifications.filter((n) => !n.read);
    await Promise.all(unreadOnes.map((n) => markNotificationRead(user.uid, n.id)));
  };

  const icon = TYPE_ICONS[notifications[0]?.type] ?? TYPE_ICONS.default;

  return (
    <div className="notif-bell" ref={dropdownRef}>
      <button
        className="notif-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
      >
        🔔
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown" role="menu" aria-label="Notifications">
          <div className="notif-dropdown-hdr">
            <span className="notif-dropdown-title">Notifications</span>
            {unread > 0 && (
              <button className="notif-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 && (
              <div className="notif-empty">No notifications</div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`notif-item ${n.read ? '' : 'unread'}`}
                onClick={() => handleClick(n)}
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleClick(n)}
              >
                <div className="notif-item-icon">
                  {TYPE_ICONS[n.type] ?? TYPE_ICONS.default}
                </div>
                <div className="notif-item-body">
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-text">{n.body}</div>
                  <div className="notif-item-time">{timeAgo(n.timestamp)}</div>
                </div>
                {!n.read && <div className="notif-unread-dot" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
