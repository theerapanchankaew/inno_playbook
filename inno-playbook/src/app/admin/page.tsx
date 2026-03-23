export const metadata = {
  title: 'Admin Dashboard | Innovation Playbook',
  description: 'Admin view for all organizations',
};

import { getAllOrganizations } from '@/lib/actions';
import { CAPS } from '@/lib/data';
import Link from 'next/link';

export default async function AdminPage() {
  const orgs = await getAllOrganizations();
  const totalDeliverables = CAPS.reduce((a, c) => a + c.deliverables.length, 0);

  return (
    <div style={{ padding: '30px', fontFamily: 'var(--sans)', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: 'var(--navy)', fontSize: '24px', fontWeight: 'bold' }}>Admin Dashboard</h1>
        <Link href="/" style={{ padding: '8px 16px', background: 'var(--navy)', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>Back to Workshop</Link>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {orgs.map(org => {
          const filled = CAPS.reduce((a, c) => a + c.deliverables.filter(d => 
            org.deliverables.some(od => od.fieldId === d.id && od.content.trim().length > 15)
          ).length, 0);
          
          const readiness = Math.round((filled / totalDeliverables) * 100);

          return (
            <div key={org.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', width: '300px' }}>
              <h2 style={{ fontSize: '18px', color: 'var(--teal)', marginBottom: '8px' }}>{org.name}</h2>
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>Sector: {org.sector || 'Not Specified'}</p>
              
              <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>ISO 56001 READINESS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--teal)' }}>{readiness}%</div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Created: {new Date(org.createdAt).toLocaleDateString()}
              </div>
            </div>
          );
        })}

        {orgs.length === 0 && (
          <div style={{ color: 'var(--muted)' }}>No organizations found. They will appear here once users start filling the workshop.</div>
        )}
      </div>
    </div>
  );
}
