'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserOrgId } from '@/lib/authActions';
import {
  CommunityIdea,
  DiscussionThread,
  DiscussionReply,
  createIdea,
  updateIdea,
  deleteIdea,
  toggleIdeaVote,
  subscribeToIdeas,
  createDiscussion,
  deleteDiscussion,
  subscribeToDiscussions,
  addReply,
  subscribeToReplies,
} from '@/lib/realtimeActions';
import UserMenu from '@/components/UserMenu';
import NotificationBell from '@/components/NotificationBell';
import GlobalNav from '@/components/GlobalNav';

type Tab = 'ideas' | 'discussions';
type IdeaCategory = 'product' | 'process' | 'service' | 'technology' | 'other';

const IDEA_CATEGORIES: { id: IdeaCategory; label: string; color: string; bg: string }[] = [
  { id: 'product',    label: 'Product',    color: '#2563EB', bg: '#EFF6FF' },
  { id: 'process',    label: 'Process',    color: '#059669', bg: '#F0FDF4' },
  { id: 'service',    label: 'Service',    color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'technology', label: 'Technology', color: '#0891B2', bg: '#ECFEFF' },
  { id: 'other',      label: 'Other',      color: '#D97706', bg: '#FFFBEB' },
];

const DISC_CATEGORIES = ['Innovation Strategy', 'Best Practice', 'Challenge', 'Resource', 'General'];

// ─── Helper ───────────────────────────────────────────────────────────────────

function timeAgo(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#0B7B74','#2563EB','#7C3AED','#DC2626','#D97706','#059669'];
function getAvatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── IdeaCard ─────────────────────────────────────────────────────────────────

function IdeaCard({
  idea, userId, onVote, onEdit, onDelete,
}: {
  idea: CommunityIdea;
  userId: string;
  onVote: (idea: CommunityIdea) => void;
  onEdit: (idea: CommunityIdea) => void;
  onDelete: (id: string) => void;
}) {
  const voted = idea.votes?.includes(userId);
  const cat   = IDEA_CATEGORIES.find(c => c.id === idea.category) ?? IDEA_CATEGORIES[4];
  const isOwner = idea.authorId === userId;

  return (
    <div className="cm-idea-card">
      <div className="cm-idea-top">
        <span className="cm-idea-cat" style={{ background: cat.bg, color: cat.color }}>
          {cat.label}
        </span>
        {idea.status !== 'open' && (
          <span className={`cm-idea-status ${idea.status}`}>{idea.status}</span>
        )}
      </div>
      <div className="cm-idea-title">{idea.title}</div>
      {idea.description && (
        <div className="cm-idea-desc">{idea.description}</div>
      )}
      {idea.tags?.length > 0 && (
        <div className="cm-idea-tags">
          {idea.tags.map(t => <span key={t} className="cm-idea-tag">#{t}</span>)}
        </div>
      )}
      <div className="cm-idea-footer">
        <div className="cm-idea-author">
          <div className="cm-avatar-sm" style={{ background: getAvatarColor(idea.authorId) }}>
            {getInitials(idea.authorName)}
          </div>
          <span className="cm-author-name">{idea.authorName}</span>
          <span className="cm-time">{timeAgo(idea.createdAt)}</span>
        </div>
        <div className="cm-idea-actions">
          {isOwner && (
            <>
              <button className="cm-edit-btn" onClick={() => onEdit(idea)}>✏️</button>
              <button className="cm-del-btn" onClick={() => onDelete(idea.id)}>🗑</button>
            </>
          )}
          <button
            className={`cm-vote-btn ${voted ? 'voted' : ''}`}
            onClick={() => onVote(idea)}
          >
            ▲ {idea.votes?.length ?? 0}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── IdeaModal ────────────────────────────────────────────────────────────────

function IdeaModal({
  idea,
  onClose,
  onSave,
}: {
  idea: CommunityIdea | null;
  onClose: () => void;
  onSave: (data: { title: string; description: string; category: IdeaCategory; tags: string[] }) => void;
}) {
  const [title,       setTitle]       = useState(idea?.title ?? '');
  const [description, setDescription] = useState(idea?.description ?? '');
  const [category,    setCategory]    = useState<IdeaCategory>(idea?.category as IdeaCategory ?? 'product');
  const [tagInput,    setTagInput]    = useState(idea?.tags?.join(', ') ?? '');
  const [saving,      setSaving]      = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    await onSave({ title: title.trim(), description: description.trim(), category, tags });
    setSaving(false);
    onClose();
  };

  return (
    <div className="cm-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cm-modal">
        <div className="cm-modal-hdr">
          <span>{idea ? '✏️ แก้ไข Idea' : '💡 เสนอ Idea ใหม่'}</span>
          <button className="cm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cm-modal-body">
          <label className="cm-field-label">ชื่อ Idea *</label>
          <input
            className="cm-field-input"
            placeholder="Innovation idea ที่ต้องการเสนอ..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <label className="cm-field-label" style={{ marginTop: 12 }}>รายละเอียด</label>
          <textarea
            className="cm-field-textarea"
            rows={4}
            placeholder="อธิบาย idea, ประโยชน์ที่จะได้รับ, ความเป็นไปได้..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <label className="cm-field-label" style={{ marginTop: 12 }}>หมวดหมู่</label>
          <div className="cm-cat-grid">
            {IDEA_CATEGORIES.map(c => (
              <button
                key={c.id}
                className={`cm-cat-btn ${category === c.id ? 'active' : ''}`}
                style={category === c.id ? { background: c.bg, color: c.color, borderColor: c.color } : {}}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="cm-field-label" style={{ marginTop: 12 }}>Tags (คั่นด้วย , )</label>
          <input
            className="cm-field-input"
            placeholder="innovation, digital, process..."
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
          />
        </div>
        <div className="cm-modal-foot">
          <button className="cm-cancel-btn" onClick={onClose}>ยกเลิก</button>
          <button
            className="cm-submit-btn"
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
          >
            {saving ? 'กำลังบันทึก...' : idea ? 'บันทึกการแก้ไข' : '💡 เสนอ Idea'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DiscussionPanel ──────────────────────────────────────────────────────────

function DiscussionPanel({
  thread,
  userId,
  userName,
  onClose,
  onDelete,
}: {
  thread: DiscussionThread;
  userId: string;
  userName: string;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsub = subscribeToReplies(thread.id, setReplies);
    return unsub;
  }, [thread.id]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    await addReply(thread.id, userId, userName, replyText.trim());
    setReplyText('');
    setSending(false);
  };

  return (
    <div className="cm-disc-panel-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cm-disc-panel">
        <div className="cm-disc-panel-hdr">
          <div>
            <div className="cm-disc-panel-title">{thread.title}</div>
            <div className="cm-disc-panel-meta">
              <span className="cm-disc-cat-tag">{thread.category}</span>
              <span className="cm-time">{timeAgo(thread.createdAt)}</span>
              <span className="cm-time">by {thread.authorName}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {thread.authorId === userId && (
              <button className="cm-del-btn" onClick={() => { onDelete(thread.id); onClose(); }}>🗑</button>
            )}
            <button className="cm-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="cm-disc-panel-body">
          <div className="cm-disc-original">
            <div className="cm-disc-original-body">{thread.body}</div>
          </div>

          <div className="cm-disc-replies-label">💬 {replies.length} replies</div>

          <div className="cm-disc-replies">
            {replies.map(r => (
              <div key={r.id} className="cm-reply-item">
                <div className="cm-avatar-sm" style={{ background: getAvatarColor(r.authorId) }}>
                  {getInitials(r.authorName)}
                </div>
                <div className="cm-reply-content">
                  <div className="cm-reply-meta">
                    <span className="cm-author-name">{r.authorName}</span>
                    <span className="cm-time">{timeAgo(r.createdAt)}</span>
                  </div>
                  <div className="cm-reply-body">{r.body}</div>
                </div>
              </div>
            ))}
            {replies.length === 0 && (
              <div className="cm-disc-no-reply">ยังไม่มี reply — เป็นคนแรกที่ตอบกลับ!</div>
            )}
          </div>
        </div>

        <div className="cm-disc-reply-bar">
          <textarea
            className="cm-reply-input"
            rows={2}
            placeholder="เขียน reply..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
          />
          <button
            className="cm-reply-send"
            onClick={handleReply}
            disabled={sending || !replyText.trim()}
          >
            {sending ? '...' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DiscussionModal ──────────────────────────────────────────────────────────

function DiscussionModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: { title: string; body: string; category: string }) => void;
}) {
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [category, setCategory] = useState(DISC_CATEGORIES[0]);
  const [saving,   setSaving]   = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), body: body.trim(), category });
    setSaving(false);
    onClose();
  };

  return (
    <div className="cm-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cm-modal">
        <div className="cm-modal-hdr">
          <span>🗣️ เริ่ม Discussion ใหม่</span>
          <button className="cm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cm-modal-body">
          <label className="cm-field-label">หัวข้อ *</label>
          <input
            className="cm-field-input"
            placeholder="หัวข้อที่ต้องการพูดถึง..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <label className="cm-field-label" style={{ marginTop: 12 }}>หมวดหมู่</label>
          <select
            className="cm-field-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {DISC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="cm-field-label" style={{ marginTop: 12 }}>เนื้อหา *</label>
          <textarea
            className="cm-field-textarea"
            rows={5}
            placeholder="เล่าสิ่งที่อยากพูดถึง, คำถาม, หรือบทเรียนที่อยากแชร์..."
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        </div>
        <div className="cm-modal-foot">
          <button className="cm-cancel-btn" onClick={onClose}>ยกเลิก</button>
          <button
            className="cm-submit-btn"
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !body.trim()}
          >
            {saving ? 'กำลังบันทึก...' : '🗣️ เริ่ม Discussion'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orgId,          setOrgId]          = useState<string | null>(null);
  const [activeTab,      setActiveTab]      = useState<Tab>('ideas');
  const [ideas,          setIdeas]          = useState<CommunityIdea[]>([]);
  const [discussions,    setDiscussions]    = useState<DiscussionThread[]>([]);
  const [showIdeaModal,  setShowIdeaModal]  = useState(false);
  const [editIdea,       setEditIdea]       = useState<CommunityIdea | null>(null);
  const [showDiscModal,  setShowDiscModal]  = useState(false);
  const [openThread,     setOpenThread]     = useState<DiscussionThread | null>(null);
  const [filterCat,      setFilterCat]      = useState<string>('all');
  const [search,         setSearch]         = useState('');
  const [loading,        setLoading]        = useState(true);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  // Load orgId
  useEffect(() => {
    if (!user) return;
    const local = localStorage.getItem(`innoPB_orgId_${user.uid}`);
    if (local) { setOrgId(local); return; }
    getUserOrgId(user.uid).then(id => setOrgId(id ?? user.uid));
  }, [user]);

  // Subscribe to ideas
  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeToIdeas(orgId, items => {
      setIdeas(items);
      setLoading(false);
    });
    return unsub;
  }, [orgId]);

  // Subscribe to discussions
  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeToDiscussions(orgId, items => setDiscussions(items));
    return unsub;
  }, [orgId]);

  if (authLoading || !user) return null;

  const userName = profile?.displayName || user.displayName || 'User';

  // Filter ideas
  const filteredIdeas = ideas.filter(i => {
    const matchCat  = filterCat === 'all' || i.category === filterCat;
    const matchSearch = !search ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase()) ||
      i.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  }).sort((a, b) => (b.votes?.length ?? 0) - (a.votes?.length ?? 0));

  // Filter discussions
  const filteredDiscs = discussions.filter(d =>
    !search ||
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.body.toLowerCase().includes(search.toLowerCase()),
  );

  // Handlers
  const handleVote = (idea: CommunityIdea) => {
    if (!user) return;
    toggleIdeaVote(idea.id, user.uid, idea.votes ?? []);
  };

  const handleSaveIdea = async (data: { title: string; description: string; category: IdeaCategory; tags: string[] }) => {
    if (!orgId || !user) return;
    if (editIdea) {
      await updateIdea(editIdea.id, data);
    } else {
      await createIdea(orgId, user.uid, userName, data.title, data.description, data.category, data.tags);
    }
    setEditIdea(null);
  };

  const handleDeleteIdea = async (id: string) => {
    if (!confirm('ลบ idea นี้หรือไม่?')) return;
    await deleteIdea(id);
  };

  const handleSaveDiscussion = async (data: { title: string; body: string; category: string }) => {
    if (!orgId || !user) return;
    await createDiscussion(orgId, user.uid, userName, data.title, data.body, data.category);
  };

  const handleDeleteDiscussion = async (id: string) => {
    if (!confirm('ลบ discussion นี้หรือไม่?')) return;
    await deleteDiscussion(id);
  };

  // Stats
  const totalVotes = ideas.reduce((s, i) => s + (i.votes?.length ?? 0), 0);
  const adoptedIdeas = ideas.filter(i => i.status === 'adopted').length;

  return (
    <div className="layout-root gnav-offset" style={{ overflow: 'auto' }}>
      <GlobalNav />

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="topbar-left">
          <Link href="/initiatives" className="ws-back-btn">← Initiatives</Link>
          <span className="topbar-divider">|</span>
          <span className="logo-badge">MASCI · ISO 56001</span>
          <span style={{ color: '#E2E8F0', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 700 }}>
            💡 Community Space
          </span>
        </div>
        <div className="topbar-right">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      <div className="cm-page">
        {/* ── Hero ── */}
        <div className="cm-hero">
          <div className="cm-hero-left">
            <div className="cm-hero-title">💡 Innovation Community</div>
            <div className="cm-hero-sub">
              แชร์ ideas, อภิปราย challenges และสร้างสรรค์นวัตกรรมร่วมกัน
            </div>
          </div>
          <div className="cm-hero-stats">
            <div className="cm-hero-stat">
              <div className="cm-hero-stat-num">{ideas.length}</div>
              <div className="cm-hero-stat-lbl">Ideas</div>
            </div>
            <div className="cm-hero-stat">
              <div className="cm-hero-stat-num">{totalVotes}</div>
              <div className="cm-hero-stat-lbl">Votes</div>
            </div>
            <div className="cm-hero-stat">
              <div className="cm-hero-stat-num">{discussions.length}</div>
              <div className="cm-hero-stat-lbl">Discussions</div>
            </div>
            <div className="cm-hero-stat">
              <div className="cm-hero-stat-num">{adoptedIdeas}</div>
              <div className="cm-hero-stat-lbl">Adopted</div>
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="cm-tab-bar">
          <button
            className={`cm-tab ${activeTab === 'ideas' ? 'active' : ''}`}
            onClick={() => setActiveTab('ideas')}
          >
            💡 Idea Board
            <span className="cm-tab-count">{ideas.length}</span>
          </button>
          <button
            className={`cm-tab ${activeTab === 'discussions' ? 'active' : ''}`}
            onClick={() => setActiveTab('discussions')}
          >
            🗣️ Discussions
            <span className="cm-tab-count">{discussions.length}</span>
          </button>
        </div>

        {/* ── Toolbar ── */}
        <div className="cm-toolbar">
          <div className="cm-toolbar-left">
            <input
              className="cm-search"
              placeholder="🔍 ค้นหา..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {activeTab === 'ideas' && (
              <div className="cm-cat-filters">
                <button
                  className={`cm-cat-filter-btn ${filterCat === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterCat('all')}
                >
                  All
                </button>
                {IDEA_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    className={`cm-cat-filter-btn ${filterCat === c.id ? 'active' : ''}`}
                    style={filterCat === c.id ? { background: c.bg, color: c.color, borderColor: c.color } : {}}
                    onClick={() => setFilterCat(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="cm-create-btn"
            onClick={() => activeTab === 'ideas' ? setShowIdeaModal(true) : setShowDiscModal(true)}
          >
            {activeTab === 'ideas' ? '💡 เสนอ Idea' : '🗣️ เริ่ม Discussion'}
          </button>
        </div>

        {/* ── IDEAS TAB ── */}
        {activeTab === 'ideas' && (
          loading ? (
            <div className="cm-loading">⏳ กำลังโหลด ideas...</div>
          ) : filteredIdeas.length === 0 ? (
            <div className="cm-empty">
              <div className="cm-empty-icon">💡</div>
              <div className="cm-empty-title">
                {ideas.length === 0 ? 'ยังไม่มี idea — เป็นคนแรก!' : 'ไม่พบ idea ที่ตรงกัน'}
              </div>
              {ideas.length === 0 && (
                <button className="cm-create-btn" onClick={() => setShowIdeaModal(true)}>
                  💡 เสนอ Idea แรก
                </button>
              )}
            </div>
          ) : (
            <div className="cm-ideas-grid">
              {filteredIdeas.map(idea => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  userId={user.uid}
                  onVote={handleVote}
                  onEdit={i => { setEditIdea(i); setShowIdeaModal(true); }}
                  onDelete={handleDeleteIdea}
                />
              ))}
            </div>
          )
        )}

        {/* ── DISCUSSIONS TAB ── */}
        {activeTab === 'discussions' && (
          filteredDiscs.length === 0 ? (
            <div className="cm-empty">
              <div className="cm-empty-icon">🗣️</div>
              <div className="cm-empty-title">
                {discussions.length === 0 ? 'ยังไม่มี discussion — เริ่มการสนทนา!' : 'ไม่พบ discussion ที่ตรงกัน'}
              </div>
              {discussions.length === 0 && (
                <button className="cm-create-btn" onClick={() => setShowDiscModal(true)}>
                  🗣️ เริ่ม Discussion แรก
                </button>
              )}
            </div>
          ) : (
            <div className="cm-disc-list">
              {filteredDiscs.map(thread => (
                <div
                  key={thread.id}
                  className="cm-disc-row"
                  onClick={() => setOpenThread(thread)}
                >
                  <div className="cm-disc-row-left">
                    <div className="cm-avatar-sm" style={{ background: getAvatarColor(thread.authorId) }}>
                      {getInitials(thread.authorName)}
                    </div>
                    <div className="cm-disc-row-content">
                      <div className="cm-disc-row-title">
                        {thread.pinned && <span className="cm-disc-pin">📌</span>}
                        {thread.title}
                      </div>
                      <div className="cm-disc-row-meta">
                        <span className="cm-disc-cat-tag">{thread.category}</span>
                        <span className="cm-time">by {thread.authorName}</span>
                        <span className="cm-time">{timeAgo(thread.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="cm-disc-row-right">
                    <span className="cm-disc-reply-count">💬 {thread.replyCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Idea Modal ── */}
      {showIdeaModal && (
        <IdeaModal
          idea={editIdea}
          onClose={() => { setShowIdeaModal(false); setEditIdea(null); }}
          onSave={handleSaveIdea}
        />
      )}

      {/* ── Discussion Modal ── */}
      {showDiscModal && (
        <DiscussionModal
          onClose={() => setShowDiscModal(false)}
          onSave={handleSaveDiscussion}
        />
      )}

      {/* ── Discussion Panel ── */}
      {openThread && (
        <DiscussionPanel
          thread={openThread}
          userId={user.uid}
          userName={userName}
          onClose={() => setOpenThread(null)}
          onDelete={handleDeleteDiscussion}
        />
      )}
    </div>
  );
}
