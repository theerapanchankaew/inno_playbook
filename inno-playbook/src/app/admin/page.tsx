'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAllOrganizations, Organization } from '@/lib/actions';
import { CAPS } from '@/lib/data';
import { useAuth, isSuperAdmin } from '@/contexts/AuthContext';
import UserMenu from '@/components/UserMenu';

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const totalDeliverables = CAPS.reduce((a, c) => a + c.deliverables.length, 0);

  // ── Guard: ต้องเป็น super_admin เท่านั้น ──────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (profile && !isSuperAdmin(profile)) { router.replace('/'); }
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    if (!isSuperAdmin(profile)) return;
    getAllOrganizations()
      .then(setOrgs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile]);

  if (authLoading || !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }

  if (!isSuperAdmin(profile)) return null;

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.sector || '').toLowerCase().includes(search.toLowerCase())
  );

  const avgReadiness = orgs.length
    ? Math.round(orgs.reduce((sum, org) => {
        const filled = CAPS.reduce((a, c) =>
          a + c.deliverables.filter(d =>
            org.deliverables.some(od => od.fieldId === d.id && od.content.trim().length > 15)
          ).length, 0);
        return sum + Math.round((filled / totalDeliverables) * 100);
      }, 0) / orgs.length)
    : 0;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--thai)' }}>

      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '0 24px', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--teal)', position: 'sticky', top: 0, zIndex: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="logo-badge">MASCI · ISO 56001</span>
          <span style={{ color: '#E2E8F0', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600 }}>
            ⚡ Admin Dashboard
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ color: '#94A3B8', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>
            ← Workshop
          </Link>
          <UserMenu />
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          <StatCard label="องค์กรทั้งหมด" value={orgs.length} unit="องค์กร" color="var(--navy)" />
          <StatCard label="ค่าเฉลี่ย Readiness" value={`${avgReadiness}%`} unit="ISO 56001" color="var(--teal)" />
          <StatCard label="Deliverables / Org" value={totalDeliverables} unit="ฟิลด์" color="var(--purple)" />
        </div>

        {/* Search + Count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>
            รายการองค์กร ({filtered.length})
          </h2>
          <input
            type="text"
            placeholder="ค้นหาชื่อองค์กร / Sector..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8,
              fontFamily: 'var(--thai)', fontSize: 13, outline: 'none',
              width: 260, background: 'white', color: 'var(--slate)',
            }}
          />
        </div>

        {/* Org Cards */}
        {loading ? (
          <div style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>กำลังโหลดข้อมูล...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(org => {
              const filled = CAPS.reduce((a, c) =>
                a + c.deliverables.filter(d =>
                  org.deliverables.some(od => od.fieldId === d.id && od.content.trim().length > 15)
                ).length, 0);
              const readiness = Math.round((filled / totalDeliverables) * 100);
              const color = readiness >= 80 ? 'var(--green)' : readiness >= 50 ? 'var(--amber)' : 'var(--red)';

              return (
                <div key={org.id} style={{
                  background: 'white', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 20,
                  transition: 'box-shadow .2s',
                }}
                  onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.08)')}
                  onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>
                    {org.name}
                  </h3>
                  <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>
                    {org.sector || 'ไม่ระบุ Sector'}
                  </p>

                  {/* Readiness Bar */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '.5px' }}>
                        ISO 56001 READINESS
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color }}>
                        {readiness}%
                      </span>
                    </div>
                    <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${readiness}%`, height: '100%',
                        background: color, borderRadius: 3,
                        transition: 'width .6s ease',
                      }} />
                    </div>
                  </div>

                  {/* CAP Progress dots */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {CAPS.map(cap => {
                      const capFilled = cap.deliverables.filter(d =>
                        org.deliverables.some(od => od.fieldId === d.id && od.content.trim().length > 15)
                      ).length;
                      const capPct = Math.round((capFilled / cap.deliverables.length) * 100);
                      const dotColor = capPct >= 80 ? 'var(--teal)' : capPct > 0 ? '#D97706' : '#E2E8F0';
                      return (
                        <div
                          key={cap.id}
                          title={`${cap.id}: ${capPct}%`}
                          style={{
                            flex: 1, height: 4, borderRadius: 2,
                            background: dotColor, transition: 'background .3s',
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    {CAPS.map(cap => (
                      <span key={cap.id} style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)' }}>
                        {cap.id}
                      </span>
                    ))}
                  </div>

                  <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>
                    {filled} / {totalDeliverables} deliverables
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12, gridColumn: '1/-1' }}>
                ไม่พบองค์กรที่ตรงกับคำค้นหา
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: string | number; unit: string; color: string }) {
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 22px',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: 'var(--sans)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{unit}</div>
    </div>
  );
}
