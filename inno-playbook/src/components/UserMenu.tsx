'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, isSuperAdmin } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/authActions';
import { ROUTES } from '@/lib/routes';

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: '⚡ Super Admin',
  org_admin: '🏢 Org Admin',
  facilitator: '🎓 Facilitator',
  member: '👤 Member',
  viewer: '👁 Viewer',
};

export default function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // ปิด dropdown เมื่อคลิกนอก
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user || !profile) return null;

  const initials = (profile.displayName || profile.email || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Avatar Button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={profile.displayName}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: open ? 'var(--teal2)' : 'var(--teal)',
          border: '2px solid rgba(20,189,180,.4)',
          color: 'white', cursor: 'pointer',
          fontSize: 11, fontWeight: 700, fontFamily: 'var(--sans)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
          flexShrink: 0,
        }}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 42,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 10, padding: '6px 0',
          minWidth: 220, zIndex: 9999,
          boxShadow: '0 8px 30px rgba(0,0,0,.12)',
          animation: 'fadeSlideDown .15s ease',
        }}>
          {/* User Info */}
          <div style={{ padding: '10px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>
              {profile.displayName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
              {profile.email}
            </div>
            <span style={{
              fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 600,
              background: '#F0FDF4', color: '#15803D',
              border: '1px solid #BBF7D0',
              borderRadius: 10, padding: '2px 8px',
            }}>
              {ROLE_LABELS[profile.role]}
            </span>
          </div>

          {/* Menu Items */}
          <div style={{ padding: '4px 0' }}>
            <MenuLink href={ROUTES.PROFILE} icon="👤" label="โปรไฟล์ของฉัน" onClick={() => setOpen(false)} />
            {isSuperAdmin(profile) && (
              <MenuLink href={ROUTES.ADMIN} icon="⚡" label="Admin Dashboard" onClick={() => setOpen(false)} />
            )}
          </div>

          {/* Sign Out */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '4px 0 2px' }}>
            <button
              onClick={() => { setOpen(false); signOut(); }}
              style={{
                width: '100%', textAlign: 'left',
                padding: '9px 16px', background: 'transparent', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                color: 'var(--red)', fontSize: 13, fontFamily: 'var(--thai)',
                transition: 'background .15s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#FEF2F2')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span>🚪</span> ออกจากระบบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px', textDecoration: 'none',
        color: 'var(--slate)', fontSize: 13, fontFamily: 'var(--thai)',
        transition: 'background .15s',
      }}
      onMouseOver={e => (e.currentTarget.style.background = 'var(--bg)')}
      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span>{icon}</span> {label}
    </Link>
  );
}
