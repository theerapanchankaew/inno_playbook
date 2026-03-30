'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, isSuperAdmin } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/routes';

// ─── Nav item definitions ──────────────────────────────────────────────────────

const MAIN_NAV = [
  { href: ROUTES.INITIATIVES, icon: '🚀', label: 'Initiatives'    },
  { href: ROUTES.DASHBOARD,   icon: '📊', label: 'Dashboard'      },
  { href: ROUTES.COMMUNITY,   icon: '💡', label: 'Community'      },
  { href: ROUTES.CANVAS,      icon: '🎨', label: 'Canvas'         },
  { href: ROUTES.EXPERTS,     icon: '🌐', label: 'Expert Network' },
];

const ADMIN_NAV = [
  { href: ROUTES.ADMIN,       icon: '⚡', label: 'Admin Hub'  },
  { href: ROUTES.ADMIN_USERS, icon: '👥', label: 'Users'      },
  { href: ROUTES.COHORTS,     icon: '🔗', label: 'Cohorts'    },
];

// ─── Active-path helper ────────────────────────────────────────────────────────

function isActive(href: string, pathname: string): boolean {
  // Exact match for top-level admin to avoid false-positive on /admin/users
  if (href === ROUTES.ADMIN) return pathname === ROUTES.ADMIN;
  // /initiatives must NOT match /initiatives/[id] workspace
  if (href === ROUTES.INITIATIVES) return pathname === ROUTES.INITIATIVES;
  return pathname.startsWith(href);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GlobalNav() {
  const { user, profile } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav className="gnav" aria-label="Main navigation">

      {/* ── Logo ── */}
      <Link href={ROUTES.INITIATIVES} className="gnav-logo" title="Innovation Playbook Platform">
        <span className="gnav-logo-icon">🏆</span>
        <span className="gnav-logo-label">InnoPlaybook</span>
      </Link>

      <div className="gnav-divider" />

      {/* ── Main navigation ── */}
      <div className="gnav-section">
        {MAIN_NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`gnav-item${isActive(item.href, pathname) ? ' active' : ''}`}
            title={item.label}
          >
            <span className="gnav-icon">{item.icon}</span>
            <span className="gnav-label">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Admin navigation — super_admin only ── */}
      {isSuperAdmin(profile) && (
        <>
          <div className="gnav-divider" />
          <div className="gnav-admin-label">ADMIN</div>
          <div className="gnav-section">
            {ADMIN_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`gnav-item admin${isActive(item.href, pathname) ? ' active' : ''}`}
                title={item.label}
              >
                <span className="gnav-icon">{item.icon}</span>
                <span className="gnav-label">{item.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── Profile — pinned to bottom ── */}
      <div className="gnav-spacer" />
      <div className="gnav-divider" />
      <Link
        href={ROUTES.PROFILE}
        className={`gnav-item${pathname === ROUTES.PROFILE ? ' active' : ''}`}
        title="โปรไฟล์ของฉัน"
      >
        <span className="gnav-icon">👤</span>
        <span className="gnav-label">โปรไฟล์</span>
      </Link>

    </nav>
  );
}
