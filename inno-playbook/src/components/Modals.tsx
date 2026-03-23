"use client";

import { useState } from 'react';
import { CAPS, EVIDENCE } from '@/lib/data';

interface ModalsProps {
  showMatrix: boolean;
  showPlaybook: boolean;
  showPresent: boolean;
  onCloseMatrix: () => void;
  onClosePlaybook: () => void;
  onClosePresent: () => void;
  data: Record<string, string>;
  orgName: string;
  orgSector: string;
}

export default function Modals({
  showMatrix,
  showPlaybook,
  showPresent,
  onCloseMatrix,
  onClosePlaybook,
  onClosePresent,
  data,
  orgName,
  orgSector
}: ModalsProps) {
  const [matrixClause, setMatrixClause] = useState('4');
  const [currentSlide, setCurrentSlide] = useState(0);

  const capPct = (id: string) => {
    const c = CAPS.find(x => x.id === id); 
    if(!c) return 0;
    const filled = c.deliverables.filter(d => (data[d.id] || '').trim().length > 15).length;
    return Math.round((filled / c.deliverables.length) * 100);
  };

  const getSlides = () => {
    const org = orgName || '[Organization]';
    const slides: any[] = [];
    slides.push({
      type: 'title', 
      title: `${org}`, 
      subtitle: `Innovation Playbook Presentation · ISO 56001-Ready`, 
      body: `โปรแกรม: 3-Day Innovation Management Intensive\n"นวัตกรรมคือ capability ไม่ใช่แค่ activity"`
    });
    
    const c1 = CAPS.find(c => c.id === 'C1');
    slides.push({
      type: 'cap', cap: c1, title: 'Innovation System & Value Creation', 
      label: data['c1_intent'] ? 'Innovation Intent Statement' : 'ยังไม่กรอก C1', 
      content: data['c1_intent'] || data['c1_assess'] || '(กรอก C1 Intent Statement ก่อนนำเสนอ)', 
      color: c1?.color
    });

    const c4 = CAPS.find(c => c.id === 'C4');
    slides.push({
      type: 'cap', cap: c4, title: 'Portfolio Management Strategy', 
      label: 'Portfolio Mix & Allocation', 
      content: data['c4_alloc'] || data['c4_map'] || '(กรอก C4)', 
      color: c4?.color
    });

    return slides;
  };

  const slides = getSlides();

  return (
    <>
      {/* Matrix Modal */}
      {showMatrix && (
        <div className="modal-overlay" onClick={onCloseMatrix}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <span className="modal-title">📋 ISO 56001:2024 Evidence Matrix</span>
              <button className="modal-close" onClick={onCloseMatrix}>✕</button>
            </div>
            <div className="modal-body">
              <div className="matrix-tabs">
                {['4','5','6','7','8','9','10'].map(k => (
                  <button 
                    key={k}
                    className={`matrix-tab ${matrixClause === k ? 'active' : ''}`}
                    onClick={() => setMatrixClause(k)}
                  >
                    Cl.{k}
                  </button>
                ))}
              </div>
              <table className="m-table">
                <thead><tr><th>Clause</th><th>Required Evidence</th><th>Typical Evidence</th><th>Core Cap</th><th>Storage</th><th>Audit Readiness</th></tr></thead>
                <tbody>
                  {(EVIDENCE as any)[matrixClause]?.map((r: any, i: number) => {
                    const cap = CAPS.find(c => c.id === r.cap);
                    const p = capPct(r.cap);
                    const cc = cap ? cap.color : '#64748B';
                    return (
                      <tr key={i}>
                        <td><span className="m-cl">{r.cl}</span></td>
                        <td>{r.ev}</td>
                        <td style={{color: 'var(--muted)'}}>{r.doc}</td>
                        <td><span className="m-cap" style={{background: `${cc}20`, color: cc, border: `1px solid ${cc}40`}}>{r.cap}</span></td>
                        <td style={{color: 'var(--muted)', fontSize: '10px'}}>{r.store}</td>
                        <td>{r.checks.map((ch: string) => <span key={ch} className={`m-chk ${p >= 50 ? 'ok' : 'no'}`}>{p >= 50 ? '☑' : '☐'} {ch}</span>)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Playbook Modal */}
      {showPlaybook && (
        <div className="modal-overlay" onClick={onClosePlaybook}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <span className="modal-title">📄 Innovation Playbook — Full Preview</span>
              <button className="modal-close" onClick={onClosePlaybook}>✕</button>
            </div>
            <div className="modal-body" style={{padding:0}}>
              <div className="pb-doc">
                <div className="pb-doc-title">🚀 Innovation Playbook</div>
                <div className="pb-doc-sub">{orgName || '[Organization Name]'} · ISO 56001-Ready</div>
                
                {CAPS.map((cap: any) => (
                  <div className="pb-doc-sec" key={cap.id}>
                    <div className="pb-doc-h2">
                      <span className="pb-doc-cbadge" style={{background: cap.color}}>{cap.id}</span>
                      {cap.playbookSection}
                    </div>
                    {cap.deliverables.map((d: any) => {
                      const v = (data[d.id] || '').trim();
                      if (!v) return null;
                      return (
                        <div key={d.id} style={{marginBottom: '10px'}}>
                          <div style={{fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: cap.color, marginBottom: '3px'}}>{d.lbl}</div>
                          <div className="pb-doc-text" dangerouslySetInnerHTML={{__html: v.replace(/\n/g, '<br>')}}></div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Presentation Modal */}
      {showPresent && (
        <div className="modal-overlay present-modal" onClick={onClosePresent}>
          <div className="modal-box" style={{maxWidth: '960px'}} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <span className="modal-title">▶ Presentation Mode</span>
              <button className="modal-close" onClick={onClosePresent}>✕</button>
            </div>
            <div className="modal-body" style={{padding:0}}>
              <div className="slide-container">
                {slides.map((sl, i) => (
                  <div key={i} className={`slide ${i === currentSlide ? 'active' : ''}`}>
                    <div className="slide-num">{i + 1} / {slides.length}</div>
                    <div className="slide-title">{sl.title}</div>
                    {sl.subtitle && <div className="slide-subtitle">{sl.subtitle}</div>}
                    {sl.body && <div className="slide-body" style={{color: '#9CA3AF'}}>{sl.body}</div>}
                    
                    {sl.type === 'cap' && (
                      <div className="slide-content-card">
                        <div className="slide-label" style={{color: sl.color}}>{sl.label}</div>
                        <div className="slide-body">{sl.content?.substring(0, 400)}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="slide-nav">
                <button className="slide-nav-btn" disabled={currentSlide === 0} onClick={() => setCurrentSlide(c => c - 1)}>← Previous</button>
                <div className="slide-progress">
                  {slides.map((_, i) => (
                    <div key={i} className={`slide-pip ${i === currentSlide ? 'active' : ''}`} onClick={() => setCurrentSlide(i)}></div>
                  ))}
                </div>
                <button className="slide-nav-btn" disabled={currentSlide === slides.length - 1} onClick={() => setCurrentSlide(c => c + 1)}>Next →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
