'use client';

import { useEffect, useState } from 'react';
import { getVersionHistory, Version } from '@/lib/realtimeActions';

function timeAgo(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface Props {
  orgId: string;
  fieldId: string;
  fieldLabel: string;
  currentContent: string;
  onRestore: (content: string) => void;
  onClose: () => void;
}

export default function VersionHistory({
  orgId,
  fieldId,
  fieldLabel,
  currentContent,
  onRestore,
  onClose,
}: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !fieldId) return;
    getVersionHistory(orgId, fieldId)
      .then(setVersions)
      .finally(() => setLoading(false));
  }, [orgId, fieldId]);

  const selected = versions.find((v) => v.id === selectedId);

  const handleRestore = (v: Version) => {
    if (confirmId === v.id) {
      onRestore(v.content);
      setConfirmId(null);
      onClose();
    } else {
      setConfirmId(v.id);
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  return (
    <div className="version-history-overlay" onClick={onClose}>
      <div
        className="version-history-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Version History"
      >
        <div className="vh-hdr">
          <div>
            <div className="vh-title">Version History</div>
            <div className="vh-sub">{fieldLabel}</div>
          </div>
          <button className="vh-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="vh-body">
          <div className="vh-list">
            <div className="vh-list-label">Saved Versions</div>
            {loading && <div className="vh-loading">Loading versions...</div>}
            {!loading && versions.length === 0 && (
              <div className="vh-empty">No versions saved yet</div>
            )}
            {versions.map((v) => (
              <div
                key={v.id}
                className={`vh-item ${selectedId === v.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(v.id)}
              >
                <div className="vh-item-avatar">{getInitials(v.displayName)}</div>
                <div className="vh-item-info">
                  <div className="vh-item-user">{v.displayName}</div>
                  <div className="vh-item-time">{timeAgo(v.timestamp)}</div>
                  <div className="vh-item-preview">
                    {v.content.slice(0, 60)}{v.content.length > 60 ? '...' : ''}
                  </div>
                </div>
                <button
                  className={`vh-restore-btn ${confirmId === v.id ? 'confirm' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleRestore(v); }}
                >
                  {confirmId === v.id ? 'Confirm?' : 'Restore'}
                </button>
              </div>
            ))}
          </div>

          <div className="vh-preview">
            <div className="vh-preview-label">
              {selected ? `Preview — ${selected.displayName}` : 'Select a version to preview'}
            </div>
            {selected ? (
              <pre className="vh-preview-content">{selected.content || '(empty)'}</pre>
            ) : (
              <div className="vh-preview-empty">
                Click a version on the left to see its content
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
