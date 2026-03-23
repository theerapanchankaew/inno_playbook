"use client";

import { useState } from 'react';
import { CAPS } from '@/lib/data';

export default function Workspace({
  activeCap,
  activeTab,
  setActiveTab,
  data,
  onFieldChange
}: any) {
  const c = CAPS.find(x => x.id === activeCap);
  if (!c) return null;

  const p = Math.round((c.deliverables.filter(d => (data[d.id] || '').trim().length > 15).length / c.deliverables.length) * 100);

  const tabs = [
    {id:'workshop',lbl:'🔬 Workshop'},
    {id:'deliverable',lbl:'📝 Deliverable'},
    {id:'isomap',lbl:'🔗 ISO Mapping'},
    {id:'preview',lbl:'📄 Playbook Preview'}
  ];

  return (
    <div className="main">
      <div className="ws-header">
        <div className="ws-cap-row">
          <div className="ws-cap-icon" style={{background: c.bg, color: c.color}}>{c.id}</div>
          <div>
            <div className="ws-cap-name">{c.name}</div>
            <div className="ws-cap-sub">{c.id} · {c.isoRef}</div>
          </div>
          <div className="ws-day-tag">{c.dayLabel}</div>
          <div className="ws-pct-tag" style={{background: c.bg, color: c.color}}>{p}% complete</div>
        </div>
        <div className="tab-bar">
          {tabs.map(t => (
            <button 
              key={t.id}
              className={`ws-tab ${activeTab === t.id ? 'active' : ''}`} 
              onClick={() => setActiveTab(t.id)}
            >
              {t.lbl}
            </button>
          ))}
        </div>
      </div>
      <div className="ws-body">
        {activeTab === 'workshop' && <WorkshopView c={c} data={data} onFieldChange={onFieldChange} />}
        {activeTab === 'deliverable' && <DeliverableView c={c} p={p} data={data} onFieldChange={onFieldChange} />}
        {activeTab === 'isomap' && <ISOMapView c={c} p={p} />}
        {activeTab === 'preview' && <PreviewView c={c} data={data} />}
      </div>
    </div>
  );
}

function WorkshopView({ c, data, onFieldChange }: any) {
  const [showExample, setShowExample] = useState(false);
  const ex = c.exercise;

  return (
    <>
      <div className="ex-banner">
        <h3>{ex.title}</h3>
        <p dangerouslySetInnerHTML={{__html: ex.desc.replace(/\n/g, '<br>')}}></p>
        <div className="ex-meta">
          <span className="ex-tag time">⏱ {ex.dur}</span>
          <span className="ex-tag fmt">👥 {ex.fmt}</span>
          <span className="ex-tag iso">{c.id} · {c.isoRef}</span>
        </div>
      </div>
      
      <div className="example-toggle" onClick={() => setShowExample(!showExample)}>
        <span>📎</span><span>{c.example.title}</span><span className={`arrow ${showExample ? 'open' : ''}`}>▶</span>
      </div>
      {showExample && (
        <div className="example-box">
          <strong>📋 ตัวอย่างจาก Appendix 1 — เพื่อใช้เป็น reference เท่านั้น</strong>
          <pre>{c.example.content}</pre>
        </div>
      )}
      
      <div className="q-card">
        <div className="q-card-hdr">💡 Guiding Questions — ตอบก่อนลงมือทำ</div>
        {ex.qs.map((q: string, i: number) => (
          <div className="q-item" key={i}>
            <span className="q-n">Q{i+1}</span>
            <span>{q}</span>
          </div>
        ))}
      </div>
      
      <div className="mb-14">
        <div className="canvas-label">📝 Workshop Notes</div>
        <textarea 
          className="canvas-area" 
          style={{minHeight: '110px'}} 
          placeholder="บันทึก key insights, ideas, challenges ระหว่าง workshop..."
          value={data[`${c.id}_notes`] || ''}
          onChange={(e) => onFieldChange(c.id, `${c.id}_notes`, e.target.value)}
        />
      </div>
      
      <div className="mb-14">
        <div className="canvas-label">🎯 Key Takeaways — 3 สิ่งที่จะนำกลับไปใช้</div>
        <textarea 
          className="canvas-area" 
          style={{minHeight: '70px'}} 
          placeholder="1. \n2. \n3. "
          value={data[`${c.id}_takeaway`] || ''}
          onChange={(e) => onFieldChange(c.id, `${c.id}_takeaway`, e.target.value)}
        />
      </div>
    </>
  );
}

function DeliverableView({ c, p, data, onFieldChange }: any) {
  const [showAI, setShowAI] = useState(false);
  
  return (
    <>
      <div className="prog-bar-row">
        <div className="prog-grid">
          <div className="prog-stat"><div className="prog-num" style={{color: c.color}}>{p}%</div><div className="prog-lbl">Completed</div></div>
          <div className="prog-stat"><div className="prog-num">{c.deliverables.filter((d:any)=>d.req).length}</div><div className="prog-lbl">Required ★</div></div>
          <div className="prog-stat"><div className="prog-num">{c.deliverables.length}</div><div className="prog-lbl">Total Fields</div></div>
          <div className="prog-stat"><div className="prog-num" style={{color: 'var(--teal)'}}>{c.isoMap.length}</div><div className="prog-lbl">ISO Clauses</div></div>
        </div>
        <div className="prog-bar-wrap"><div className="prog-bar-fill" style={{width: `${p}%`, background: c.color}}></div></div>
      </div>
      
      <div className="ai-section">
        <div className="ai-hdr">
          <span className="ai-hdr-title">✦ AI Writing Assistant — ติดอยู่? ให้ AI ช่วย draft (Mock)</span>
          <button className="ai-toggle-btn" onClick={() => setShowAI(!showAI)}>{showAI ? 'ย่อ ▲' : 'เปิด ▼'}</button>
        </div>
        <div className={`ai-body ${showAI ? 'open' : ''}`}>
          <div className="ai-context">กำลังช่วย: <strong>{c.id} — {c.name}</strong> · AI Setup is required in backend.</div>
        </div>
      </div>

      {c.deliverables.map((d: any) => (
        <div className="del-sec" key={d.id}>
          <div className="del-hdr">
            <span className="del-title">{d.req ? '★ ' : ''}{d.lbl}</span>
            <span className="del-iso-tag">{c.id}</span>
          </div>
          <div className="del-body">
            <div className="del-field-lbl">{d.lbl} {d.req && <span className="req">*</span>}</div>
            <div className="del-hint">{d.hint}</div>
            <textarea 
              className="del-input" 
              style={{ minHeight: (d.ph || '').length > 200 ? '130px' : '80px' }} 
              placeholder={d.ph || ''}
              value={data[d.id] || ''}
              onChange={(e) => onFieldChange(c.id, d.id, e.target.value)}
            />
          </div>
        </div>
      ))}
      <div style={{height: '16px'}}></div>
    </>
  );
}

function ISOMapView({ c, p }: any) {
  return (
    <>
      <div className="iso-intro">
        <strong>ISO 56001:2024 Clause Mapping — {c.id}: {c.name}</strong><br/>
        Capability นี้สนับสนุน clauses: <strong>{c.isoRef}</strong> — เมื่อพัฒนา {c.id} จะสร้าง evidence สำหรับ clauses ด้านล่างโดยตรง
      </div>
      <table className="iso-table">
        <thead><tr><th>Clause</th><th>Requirement</th><th>How {c.id} Supports Compliance</th><th>Status</th></tr></thead>
        <tbody>
          {c.isoMap.map((m: any, i: number) => (
            <tr key={i}>
              <td><span className="iso-clause">{m.cl}</span></td>
              <td>{m.title}</td>
              <td style={{lineHeight: 1.55}}>{m.notes}</td>
              <td><span className={`iso-status ${p >= 50 ? 'done' : 'todo'}`}>{p >= 50 ? '✓ Evidence' : '○ In Progress'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{marginTop: '12px', padding: '10px 14px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '9px', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.65}}>
        <strong style={{color: 'var(--navy)'}}>📌 Audit Thinking:</strong> สำหรับแต่ละ clause — (1) Evidence คืออะไร? (2) เก็บที่ไหน? (3) ใครเป็นเจ้าของ? (4) แสดง Decision หรือ Learning อะไร?
      </div>
    </>
  );
}

function PreviewView({ c, data }: any) {
  const hasCont = c.deliverables.some((d: any) => (data[d.id] || '').trim().length > 10);
  
  return (
    <>
      <div className="pb-preview">
        <div className="pb-prev-hdr">
          <span className="pb-prev-title">📄 {c.playbookSection}</span>
          <span className="pb-prev-meta">{c.id}</span>
        </div>
        {hasCont ? (
          c.deliverables.map((d: any) => {
            const v = (data[d.id] || '').trim();
            if (!v) return null;
            return (
              <div className="pb-sec" key={d.id}>
                <div className="pb-sec-label">{d.lbl}</div>
                <div className="pb-content" dangerouslySetInnerHTML={{__html: v.replace(/\n/g, '<br>')}}></div>
              </div>
            );
          })
        ) : (
          <div className="pb-sec">
            <div className="pb-empty">ยังไม่มีเนื้อหา — กรอก Deliverable tab ก่อน เนื้อหาจะปรากฏที่นี่โดยอัตโนมัติ</div>
          </div>
        )}
      </div>
    </>
  );
}
