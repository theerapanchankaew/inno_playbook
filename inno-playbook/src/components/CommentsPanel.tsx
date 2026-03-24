'use client';

import { useEffect, useState, useRef } from 'react';
import {
  subscribeToComments,
  addComment,
  deleteComment,
  Comment,
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  '#0B7B74', '#2563EB', '#7C3AED', '#DC2626', '#D97706',
  '#059669', '#DB2777', '#0284C7',
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface Props {
  orgId: string;
  fieldId: string;
  fieldLabel: string;
  onClose: () => void;
}

export default function CommentsPanel({ orgId, fieldId, fieldLabel, onClose }: Props) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orgId || !fieldId) return;
    const unsub = subscribeToComments(orgId, fieldId, (data) => {
      setComments(data);
      setLoading(false);
    });
    return unsub;
  }, [orgId, fieldId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSubmit = async () => {
    if (!text.trim() || !user || submitting) return;
    setSubmitting(true);
    try {
      const displayName = profile?.displayName || user.displayName || 'User';
      await addComment(orgId, fieldId, user.uid, displayName, text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      await deleteComment(orgId, fieldId, commentId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="comments-panel">
      <div className="comments-panel-hdr">
        <div>
          <div className="comments-panel-title">Comments</div>
          <div className="comments-panel-sub">{fieldLabel}</div>
        </div>
        <button className="comments-panel-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="comments-panel-body">
        {loading && (
          <div className="comments-loading">Loading comments...</div>
        )}
        {!loading && comments.length === 0 && (
          <div className="comments-empty">
            No comments yet. Be the first to comment!
          </div>
        )}
        {comments.map((c) => (
          <div key={c.id} className="comment-item">
            <div
              className="comment-avatar"
              style={{ background: getAvatarColor(c.userId) }}
            >
              {getInitials(c.displayName)}
            </div>
            <div className="comment-body">
              <div className="comment-meta">
                <span className="comment-author">{c.displayName}</span>
                <span className="comment-time">{timeAgo(c.timestamp)}</span>
                {user?.uid === c.userId && (
                  <button
                    className="comment-delete"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    aria-label="Delete comment"
                  >
                    {deletingId === c.id ? '...' : '✕'}
                  </button>
                )}
              </div>
              <div className="comment-text">{c.text}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="comment-input-area">
        <textarea
          className="comment-input"
          placeholder="Add a comment... (Ctrl+Enter to send)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={!user}
        />
        <button
          className="comment-send-btn"
          onClick={handleSubmit}
          disabled={!text.trim() || submitting || !user}
        >
          {submitting ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
