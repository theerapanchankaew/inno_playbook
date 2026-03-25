'use client';

import { useState, useEffect } from 'react';
import {
  Initiative,
  InitiativeInput,
  InitiativeStatus,
  InitiativePriority,
  InitiativeType,
  InitiativeKPI,
  InitiativeMilestone,
  STATUS_META,
  PRIORITY_META,
  TYPE_META,
  createInitiative,
  updateInitiative,
} from '@/lib/initiativeActions';
import { CAPS } from '@/lib/data';

interface Props {
  orgId: string;
  ownerId: string;
  ownerName: string;
  initiative?: Initiative | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: Omit<InitiativeInput, 'orgId' | 'ownerId' | 'ownerName' | 'createdBy'> = {
  title: '',
  description: '',
  status: 'draft',
  priority: 'medium',
  type: 'product',
  targetDate: '',
  budget: undefined,
  tags: [],
  linkedCapId: '',
  overallProgress: 0,
  kpis: [{ name: '', target: '' }],
  milestones: [],
};

export default function InitiativeModal({ orgId, ownerId, ownerName, initiative, onClose, onSaved }: Props) {
  const isEdit = !!initiative;

  const [form, setForm] = useState({ ...EMPTY });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'basic' | 'detail' | 'kpi' | 'milestone'>('basic');

  useEffect(() => {
    if (initiative) {
      setForm({
        title:           initiative.title,
        description:     initiative.description,
        status:          initiative.status,
        priority:        initiative.priority,
        type:            initiative.type,
        targetDate:      initiative.targetDate,
        budget:          initiative.budget,
        tags:            initiative.tags ?? [],
        linkedCapId:     initiative.linkedCapId ?? '',
        overallProgress: initiative.overallProgress,
        kpis:            initiative.kpis?.length ? initiative.kpis : [{ name: '', target: '' }],
        milestones:      initiative.milestones ?? [],
      });
    }
  }, [initiative]);

  /* ── form helpers ── */
  const set = (key: string, value: unknown) => setForm(p => ({ ...p, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const removeTag = (t: string) => set('tags', form.tags.filter(x => x !== t));

  /* ── KPI helpers ── */
  const setKPI = (i: number, field: keyof InitiativeKPI, val: string) => {
    const kpis = form.kpis.map((k, idx) => idx === i ? { ...k, [field]: val } : k);
    set('kpis', kpis);
  };
  const addKPI  = () => set('kpis', [...form.kpis, { name: '', target: '' }]);
  const removeKPI = (i: number) => set('kpis', form.kpis.filter((_, idx) => idx !== i));

  /* ── Milestone helpers ── */
  const addMilestone = () => {
    const ms: InitiativeMilestone = {
      id: Date.now().toString(),
      title: '',
      dueDate: '',
      completed: false,
    };
    set('milestones', [...form.milestones, ms]);
  };
  const setMS = (id: string, field: keyof InitiativeMilestone, val: unknown) => {
    set('milestones', form.milestones.map(m => m.id === id ? { ...m, [field]: val } : m));
  };
  const removeMS = (id: string) => set('milestones', form.milestones.filter(m => m.id !== id));

  /* ── Save ── */
  const handleSave = async () => {
    if (!form.title.trim()) { setError('กรุณาระบุชื่อ Initiative'); return; }
    setSaving(true);
    setError('');
    try {
      const cleanKPIs = form.kpis.filter(k => k.name.trim());
      if (isEdit && initiative) {
        await updateInitiative(initiative.id, {
          ...form,
          kpis: cleanKPIs,
          ownerName,
          ownerId,
          orgId,
        });
      } else {
        await createInitiative({
          ...form,
          kpis: cleanKPIs,
          orgId,
          ownerId,
          ownerName,
          createdBy: ownerId,
        });
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { key: 'basic',     label: '📋 ข้อมูลหลัก' },
    { key: 'detail',    label: '🔗 รายละเอียด' },
    { key: 'kpi',       label: '📊 KPI' },
    { key: 'milestone', label: '🏁 Milestones' },
  ] as const;

  return (
    <div className="init-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="init-modal">
        {/* Header */}
        <div className="init-modal-hdr">
          <div>
            <div className="init-modal-title">{isEdit ? '✏️ แก้ไข Initiative' : '➕ สร้าง Initiative ใหม่'}</div>
            <div className="init-modal-sub">Innovation Initiative Management</div>
          </div>
          <button className="init-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Section tabs */}
        <div className="init-modal-tabs">
          {sections.map(s => (
            <button
              key={s.key}
              className={`init-modal-tab ${activeSection === s.key ? 'active' : ''}`}
              onClick={() => setActiveSection(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="init-modal-body">

          {/* ── SECTION: Basic ── */}
          {activeSection === 'basic' && (
            <div className="init-section">
              <div className="init-field">
                <label className="init-label">ชื่อ Initiative <span className="req">*</span></label>
                <input
                  className="init-input"
                  placeholder="เช่น AI-Powered Customer Experience Platform"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                />
              </div>

              <div className="init-field">
                <label className="init-label">คำอธิบาย</label>
                <textarea
                  className="init-textarea"
                  rows={3}
                  placeholder="อธิบายเป้าหมาย ปัญหาที่แก้ไข และ value ที่จะสร้าง..."
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                />
              </div>

              <div className="init-row-2">
                <div className="init-field">
                  <label className="init-label">ประเภทนวัตกรรม</label>
                  <select className="init-select" value={form.type} onChange={e => set('type', e.target.value as InitiativeType)}>
                    {(Object.entries(TYPE_META) as [InitiativeType, typeof TYPE_META[InitiativeType]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>

                <div className="init-field">
                  <label className="init-label">Priority</label>
                  <select className="init-select" value={form.priority} onChange={e => set('priority', e.target.value as InitiativePriority)}>
                    {(Object.entries(PRIORITY_META) as [InitiativePriority, typeof PRIORITY_META[InitiativePriority]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="init-row-2">
                <div className="init-field">
                  <label className="init-label">Status</label>
                  <select className="init-select" value={form.status} onChange={e => set('status', e.target.value as InitiativeStatus)}>
                    {(Object.entries(STATUS_META) as [InitiativeStatus, typeof STATUS_META[InitiativeStatus]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div className="init-field">
                  <label className="init-label">Target Date</label>
                  <input
                    className="init-input"
                    type="date"
                    value={form.targetDate}
                    onChange={e => set('targetDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="init-field">
                <label className="init-label">Tags</label>
                <div className="init-tags-row">
                  {form.tags.map(t => (
                    <span key={t} className="init-tag">
                      {t}
                      <button className="init-tag-rm" onClick={() => removeTag(t)}>×</button>
                    </span>
                  ))}
                  <input
                    className="init-tag-input"
                    placeholder="เพิ่ม tag..."
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <button className="init-tag-add" onClick={addTag}>+</button>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION: Detail ── */}
          {activeSection === 'detail' && (
            <div className="init-section">
              <div className="init-field">
                <label className="init-label">เชื่อมกับ CAP (Capability Area)</label>
                <select
                  className="init-select"
                  value={form.linkedCapId}
                  onChange={e => set('linkedCapId', e.target.value)}
                >
                  <option value="">— ไม่ระบุ —</option>
                  {CAPS.map(c => (
                    <option key={c.id} value={c.id}>{c.id} — {c.name}</option>
                  ))}
                </select>
                <div className="init-hint">เชื่อมโยง initiative นี้กับ CAP ใน Innovation Playbook</div>
              </div>

              <div className="init-field">
                <label className="init-label">งบประมาณ (บาท)</label>
                <input
                  className="init-input"
                  type="number"
                  placeholder="เช่น 1500000"
                  value={form.budget ?? ''}
                  onChange={e => set('budget', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>

              <div className="init-field">
                <label className="init-label">ความคืบหน้า (%)</label>
                <div className="init-progress-row">
                  <input
                    className="init-range"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={form.overallProgress}
                    onChange={e => set('overallProgress', Number(e.target.value))}
                  />
                  <span className="init-progress-val">{form.overallProgress}%</span>
                </div>
                <div className="init-progress-bar-wrap">
                  <div className="init-progress-bar" style={{ width: `${form.overallProgress}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION: KPI ── */}
          {activeSection === 'kpi' && (
            <div className="init-section">
              <div className="init-section-desc">
                กำหนด Key Performance Indicators เพื่อวัดความสำเร็จของ Initiative
              </div>
              {form.kpis.map((kpi, i) => (
                <div key={i} className="init-kpi-row">
                  <div className="init-kpi-num">{i + 1}</div>
                  <div className="init-kpi-fields">
                    <input
                      className="init-input"
                      placeholder="ชื่อ KPI เช่น NPS Score, Revenue Growth"
                      value={kpi.name}
                      onChange={e => setKPI(i, 'name', e.target.value)}
                    />
                    <div className="init-row-2" style={{ marginTop: 6 }}>
                      <input
                        className="init-input"
                        placeholder="Target เช่น +20%, 500 users"
                        value={kpi.target}
                        onChange={e => setKPI(i, 'target', e.target.value)}
                      />
                      <input
                        className="init-input"
                        placeholder="Current (optional)"
                        value={kpi.current ?? ''}
                        onChange={e => setKPI(i, 'current', e.target.value)}
                      />
                    </div>
                  </div>
                  <button className="init-rm-btn" onClick={() => removeKPI(i)} title="ลบ">🗑</button>
                </div>
              ))}
              <button className="init-add-row-btn" onClick={addKPI}>+ เพิ่ม KPI</button>
            </div>
          )}

          {/* ── SECTION: Milestone ── */}
          {activeSection === 'milestone' && (
            <div className="init-section">
              <div className="init-section-desc">
                กำหนด Milestones สำคัญของ Initiative เพื่อ track progress
              </div>
              {form.milestones.length === 0 && (
                <div className="init-empty-ms">ยังไม่มี Milestone — กด "+ เพิ่ม Milestone" เพื่อเริ่มต้น</div>
              )}
              {form.milestones.map((ms) => (
                <div key={ms.id} className="init-ms-row">
                  <input
                    className="init-ms-check"
                    type="checkbox"
                    checked={ms.completed}
                    onChange={e => setMS(ms.id, 'completed', e.target.checked)}
                  />
                  <div className="init-ms-fields">
                    <input
                      className={`init-input ${ms.completed ? 'done' : ''}`}
                      placeholder="ชื่อ Milestone เช่น Prototype Ready, User Testing"
                      value={ms.title}
                      onChange={e => setMS(ms.id, 'title', e.target.value)}
                    />
                    <input
                      className="init-input"
                      type="date"
                      value={ms.dueDate}
                      onChange={e => setMS(ms.id, 'dueDate', e.target.value)}
                      style={{ marginTop: 5 }}
                    />
                  </div>
                  <button className="init-rm-btn" onClick={() => removeMS(ms.id)} title="ลบ">🗑</button>
                </div>
              ))}
              <button className="init-add-row-btn" onClick={addMilestone}>+ เพิ่ม Milestone</button>
            </div>
          )}

        </div>

        {/* Footer */}
        {error && <div className="init-modal-error">{error}</div>}
        <div className="init-modal-foot">
          <button className="init-cancel-btn" onClick={onClose}>ยกเลิก</button>
          <button
            className="init-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'กำลังบันทึก...' : isEdit ? '💾 บันทึกการแก้ไข' : '✅ สร้าง Initiative'}
          </button>
        </div>
      </div>
    </div>
  );
}
