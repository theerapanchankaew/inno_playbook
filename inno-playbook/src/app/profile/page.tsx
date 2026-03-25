'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { updateDisplayName, updateUserRole, getAllUsers, UserProfile, UserRole } from '@/lib/authActions';
import { isSuperAdmin } from '@/contexts/AuthContext';
import GlobalNav from '@/components/GlobalNav';

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: '⚡ Super Admin',
  org_admin: '🏢 Org Admin',
  facilitator: '🎓 Facilitator',
  member: '👤 Member',
  viewer: '👁 Viewer',
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: '#B91C1C',
  org_admin: '#D97706',
  facilitator: '#4C4C9E',
  member: '#0B7B74',
  viewer: '#64748B',
};

export default function ProfilePage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
    }
  }, [profile]);

  // Super admin: โหลด user ทั้งหมด
  useEffect(() => {
    if (isSuperAdmin(profile)) {
      setLoadingUsers(true);
      getAllUsers()
        .then(setAllUsers)
        .catch(console.error)
        .finally(() => setLoadingUsers(false));
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    await updateDisplayName(user.uid, displayName.trim());
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleRoleChange = async (uid: string, role: UserRole) => {
    await updateUserRole(uid, role);
    setAllUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u));
  };

  if (loading || !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: 12 }}>
        กำลังโหลด...
      </div>
    );
  }

  const initials = (profile.displayName || profile.email || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="gnav-offset" style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--thai)' }}>
      <GlobalNav />
      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '0 24px', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--teal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="logo-badge">MASCI · ISO 56001</span>
          <span style={{ color: '#E2E8F0', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600 }}>
            โปรไฟล์ผู้ใช้งาน
          </span>
        </div>
        <Link href="/initiatives" style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>
          ← กลับ Initiatives
        </Link>
      </div>

      <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>

        {/* Profile Card */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
            {/* Avatar */}
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--teal)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, fontFamily: 'var(--sans)',
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>
                {profile.displayName}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{profile.email}</div>
              <span style={{
                background: ROLE_COLORS[profile.role] + '20',
                color: ROLE_COLORS[profile.role],
                border: `1px solid ${ROLE_COLORS[profile.role]}40`,
                borderRadius: 20,
                padding: '2px 10px',
                fontSize: 11,
                fontFamily: 'var(--mono)',
                fontWeight: 600,
              }}>
                {ROLE_LABELS[profile.role]}
              </span>
            </div>
          </div>

          {/* Edit Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '1px', color: 'var(--teal)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              ชื่อที่แสดง
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                style={{
                  flex: 1, padding: '10px 14px', border: '1px solid var(--border)',
                  borderRadius: 8, fontFamily: 'var(--thai)', fontSize: 14,
                  outline: 'none', color: 'var(--slate)',
                }}
                placeholder="ชื่อ นามสกุล"
              />
              <button
                onClick={handleSave}
                disabled={saving || displayName === profile.displayName}
                style={{
                  padding: '10px 20px', background: 'var(--teal)', color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
                  opacity: (saving || displayName === profile.displayName) ? 0.5 : 1,
                  transition: 'opacity .2s',
                }}
              >
                {saving ? 'กำลังบันทึก...' : saved ? '✓ บันทึกแล้ว' : 'บันทึก'}
              </button>
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={signOut}
            style={{
              padding: '9px 18px', background: 'transparent',
              border: '1px solid #FCA5A5', borderRadius: 8,
              color: 'var(--red)', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
              transition: 'all .2s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#FEE2E2')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
          >
            ออกจากระบบ
          </button>
        </div>

        {/* Super Admin: User Management */}
        {isSuperAdmin(profile) && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>
                ⚡ จัดการผู้ใช้งาน ({allUsers.length} คน)
              </h2>
              <Link href="/admin" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--teal)', textDecoration: 'none' }}>
                Admin Dashboard →
              </Link>
            </div>

            {loadingUsers ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>กำลังโหลด...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allUsers.map(u => (
                  <div key={u.uid} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', background: 'var(--bg)', borderRadius: 8,
                    border: u.uid === user?.uid ? '1px solid var(--teal)' : '1px solid transparent',
                  }}>
                    {/* Mini Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: ROLE_COLORS[u.role], color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                      {(u.displayName || u.email || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate)' }}>
                        {u.displayName}
                        {u.uid === user?.uid && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                            (คุณ)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}</div>
                    </div>

                    {/* Role Selector */}
                    {u.uid !== user?.uid ? (
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.uid, e.target.value as UserRole)}
                        style={{
                          padding: '5px 10px', border: '1px solid var(--border)',
                          borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 11,
                          background: 'white', color: ROLE_COLORS[u.role], cursor: 'pointer',
                        }}
                      >
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{
                        fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600,
                        color: ROLE_COLORS[u.role],
                      }}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
