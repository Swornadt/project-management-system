import React, { useState } from 'react';
import {
  X,
  Share2,
  Tag,
  FileEdit,
  Save,
  Trash2,
} from 'lucide-react';
import type { ContentItem } from '../../types';

interface ArticleDrawerProps {
  item: ContentItem | null;
  onClose: () => void;
  onUpdateItem: (updated: ContentItem) => void;
  onDeleteItem: (id: string) => void;
  onShowToast: (title: string, subtitle?: string) => void;
}

export const ArticleDrawer: React.FC<ArticleDrawerProps> = ({
  item,
  onClose,
  onUpdateItem,
  onDeleteItem,
  onShowToast,
}) => {
  if (!item) return null;

  const [activeTab, setActiveTab] = useState<'content' | 'metadata' | 'history'>('content');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item.title);
  const [editedSummary, setEditedSummary] = useState(item.summary || '');
  const [editedBody, setEditedBody] = useState(
    item.body ||
      `### Executive Summary\n${item.summary || 'No detailed body specified yet.'}\n\n### Implementation Details\n- Automated pipeline integration\n- Multi-region validation\n- Governance approval verified`
  );
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Content can only be edited while it's a draft — every other status is
  // read-only until it moves through the workflow actions below.
  const canEdit = item.status === 'draft';

  const handleSave = () => {
    const updated: ContentItem = {
      ...item,
      title: editedTitle,
      summary: editedSummary,
      body: editedBody,
      lastUpdated: 'Just now',
      timestampHours: 0.1,
    };
    onUpdateItem(updated);
    setIsEditing(false);
    onShowToast('Changes Saved', `Updated "${editedTitle}"`);
  };

  // Workflow actions — these mirror the backend's submit/decide/publish
  // endpoints (status only ever moves forward one step at a time; the only
  // way back to draft is a reviewer's rejection, with a reason attached).
  // TODO: once auth exists, gate Approve/Reject to reviewers only — the
  // author of the content should never see these controls on their own item.
  const handleSubmitForApproval = () => {
    onUpdateItem({ ...item, status: 'pending', lastUpdated: 'Just now' });
    onShowToast('Submitted for Approval', `"${item.title}" is awaiting review`);
  };

  const handleApprove = () => {
    onUpdateItem({ ...item, status: 'approved', lastUpdated: 'Just now' });
    onShowToast('Approved', `"${item.title}" is ready to publish`);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onUpdateItem({
      ...item,
      status: 'draft',
      rejectionReason: rejectReason.trim(),
      lastUpdated: 'Just now',
    });
    onShowToast('Rejected', `"${item.title}" was sent back to draft`);
    setShowRejectInput(false);
    setRejectReason('');
  };

  const handlePublish = () => {
    onUpdateItem({ ...item, status: 'published', lastUpdated: 'Just now' });
    onShowToast('Published', `"${item.title}" is now live`);
  };

  const getStatusBadge = (status: ContentItem['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ffe8d4] text-[#dd5b00]">
            Pending Approval
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#d9f3e1] text-[#1aae39]">
            Approved
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f0eeec] text-[#5d5b54]">
            Draft
          </span>
        );
      case 'published':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e6e0f5] text-[#5645d4]">
            Published
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl z-50 flex flex-col border-l border-[#e8e7e4] animate-in slide-in-from-right duration-300">
        {/* Top Header Bar */}
        <div className="p-4 border-b border-[#e8e7e4] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2">
            {getStatusBadge(item.status)}
            {item.version && (
              <span className="px-2 py-0.5 rounded text-xs bg-[#e4e9ec] text-[#5d5b54] font-medium">
                {item.version}
              </span>
            )}
            <span className="text-xs text-[#9b9a97]">• {item.projectName}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#5d5b54]">
            {!isEditing ? (
              canEdit && (
                <button
                  id="edit-article-btn"
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-[#f0eeec] border border-[#e8e7e4] rounded-lg transition-colors flex items-center gap-1 text-[#37352f]"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )
            ) : (
              <button
                id="save-article-btn"
                onClick={handleSave}
                className="px-3 py-1 text-xs font-medium bg-[#5645d4] hover:bg-[#4534b3] text-white rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            )}

            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.origin + item.slug);
                onShowToast('Share Link Copied', item.slug);
              }}
              className="p-1.5 hover:bg-[#f0eeec] rounded-lg transition-colors"
              title="Copy share link"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              id="close-drawer-btn"
              onClick={onClose}
              className="p-1.5 hover:bg-[#f0eeec] rounded-lg transition-colors"
              title="Close reader"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title and Meta Info */}
        <div className="p-6 border-b border-[#f1efed]">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#9b9a97] uppercase">Document Title</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full text-lg font-semibold text-[#37352f] p-2 border border-[#e8e7e4] rounded-lg mt-1 outline-none focus:border-[#5645d4]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#9b9a97] uppercase">URL Slug</label>
                <input
                  type="text"
                  disabled
                  value={item.slug}
                  className="w-full text-xs p-2 border border-[#e8e7e4] rounded-lg mt-1 bg-[#f7f6f5] text-[#787671] font-mono"
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-[#37352f] tracking-tight">{item.title}</h2>
              <div className="flex items-center gap-2 mt-2 font-mono text-xs text-[#0075de]">
                <span>{item.slug}</span>
              </div>
            </div>
          )}

          {/* Quick info strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#f1efed] text-xs">
            <div>
              <span className="text-[#9b9a97] block">Author</span>
              <div className="flex items-center gap-1.5 mt-1">
                {item.author.avatarUrl ? (
                  <img
                    src={item.author.avatarUrl}
                    alt={item.author.name}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full ${item.author.avatarBg} ${item.author.textColor} text-[10px] font-bold flex items-center justify-center`}
                  >
                    {item.author.initials}
                  </div>
                )}
                <span className="font-medium text-[#37352f] truncate">{item.author.name}</span>
              </div>
            </div>

            <div>
              <span className="text-[#9b9a97] block">Last Updated</span>
              <span className="font-medium text-[#37352f] mt-1 block">{item.lastUpdated}</span>
            </div>

            <div>
              <span className="text-[#9b9a97] block">Project</span>
              <span className="font-medium text-[#37352f] mt-1 block truncate">
                {item.projectName}
              </span>
            </div>

            <div>
              <span className="text-[#9b9a97] block">Audience Views</span>
              <span className="font-medium text-[#37352f] mt-1 block">
                {item.views ? item.views.toLocaleString() : '1,240'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 px-6 border-b border-[#e8e7e4] text-xs font-medium">
          <button
            onClick={() => setActiveTab('content')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'content'
                ? 'border-[#5645d4] text-[#5645d4] font-semibold'
                : 'border-transparent text-[#5d5b54] hover:text-[#37352f]'
            }`}
          >
            Article Preview
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'metadata'
                ? 'border-[#5645d4] text-[#5645d4] font-semibold'
                : 'border-transparent text-[#5d5b54] hover:text-[#37352f]'
            }`}
          >
            Metadata &amp; Governance
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-[#5645d4] text-[#5645d4] font-semibold'
                : 'border-transparent text-[#5d5b54] hover:text-[#37352f]'
            }`}
          >
            Audit Trail
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-[#37352f]">
          {activeTab === 'content' && (
            <div className="space-y-4">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#9b9a97] uppercase">
                      Short Summary / Abstract
                    </label>
                    <textarea
                      rows={2}
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                      className="w-full p-2.5 border border-[#e8e7e4] rounded-lg text-xs mt-1 outline-none focus:border-[#5645d4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#9b9a97] uppercase">
                      Content Body (Markdown Supported)
                    </label>
                    <textarea
                      rows={12}
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      className="w-full p-2.5 font-mono border border-[#e8e7e4] rounded-lg text-xs mt-1 outline-none focus:border-[#5645d4]"
                    />
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-[#37352f] leading-relaxed">
                  {item.summary && (
                    <div className="p-3.5 bg-[#f0f4f8] rounded-xl border border-[#dfe3e7] text-xs text-[#545e7d] italic mb-4">
                      {item.summary}
                    </div>
                  )}

                  <div className="space-y-3">
                    <p>
                      {item.body
                        ? item.body
                        : 'This document represents an official enterprise publication deployed through Acme Global Operations workspace pipelines.'}
                    </p>
                    <p className="text-xs text-[#787671]">
                      Published under enterprise access controls. Verified with SHA-256 integrity signatures and synced with production edge CDN clusters.
                    </p>
                  </div>

                  {/* Status banner + workflow actions — one action set per
                      status, matching the backend's state machine. There is
                      no free-form status picker: the only way to change
                      status is through these actions. */}
                  <div className="mt-8 pt-4 border-t border-[#f1efed]">
                    {item.status === 'draft' && item.rejectionReason && (
                      <div className="mb-3 p-3 rounded-lg bg-[#fde0e0] text-[#ba1a1a] text-xs">
                        This was rejected: "{item.rejectionReason}"
                      </div>
                    )}

                    {item.status === 'draft' && (
                      <button
                        onClick={handleSubmitForApproval}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#5645d4] text-white hover:bg-[#4534b3] transition-colors"
                      >
                        Submit for Approval
                      </button>
                    )}

                    {item.status === 'pending' && (
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-[#ffe8d4] text-[#dd5b00] text-xs">
                          Submitted for approval and awaiting review.
                        </div>
                        {!showRejectInput ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={handleApprove}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#d9f3e1] text-[#1aae39] hover:bg-[#c2ebd0] transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setShowRejectInput(true)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#fde0e0] text-[#ba1a1a] hover:bg-[#fbd0d0] transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason for rejection (required)"
                              className="w-full p-2 border border-[#e8e7e4] rounded-lg text-xs outline-none focus:border-[#ba1a1a]"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim()}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#ba1a1a] text-white hover:bg-[#a01616] transition-colors disabled:opacity-50"
                              >
                                Confirm Rejection
                              </button>
                              <button
                                onClick={() => {
                                  setShowRejectInput(false);
                                  setRejectReason('');
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#5d5b54] hover:bg-[#f0eeec] transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {item.status === 'approved' && (
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-[#d9f3e1] text-[#1aae39] text-xs">
                          Approved — ready to publish.
                        </div>
                        <button
                          onClick={handlePublish}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#e6e0f5] text-[#5645d4] hover:bg-[#d7d2ff] transition-colors"
                        >
                          Publish
                        </button>
                      </div>
                    )}

                    {item.status === 'published' && (
                      <div className="p-3 rounded-lg bg-[#f0eeec] text-[#5d5b54] text-xs">
                        Published{item.version ? ` · Version ${item.version}` : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-4 text-xs">
              <div className="bg-[#fafaf9] p-4 rounded-xl border border-[#e8e7e4] space-y-2.5">
                <div className="flex justify-between py-1 border-b border-[#f1efed]">
                  <span className="text-[#9b9a97]">Document ID:</span>
                  <span className="font-mono text-[#37352f]">{item.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#f1efed]">
                  <span className="text-[#9b9a97]">Project Scope:</span>
                  <span className="font-medium text-[#37352f]">{item.projectName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#f1efed]">
                  <span className="text-[#9b9a97]">Security Classification:</span>
                  <span className="font-medium text-[#1aae39]">Confidential Internal (C2)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#f1efed]">
                  <span className="text-[#9b9a97]">SEO Canonical Slug:</span>
                  <span className="font-mono text-[#0075de]">{item.slug}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#9b9a97]">Compliance Hash:</span>
                  <span className="font-mono text-[#787671]">sha256-9f82d1c...</span>
                </div>
              </div>

              {item.tags && item.tags.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-[#9b9a97] uppercase block mb-2">
                    Taxonomy Tags
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-[#e4e9ec] text-[#5d5b54] text-xs flex items-center gap-1"
                      >
                        <Tag className="w-3 h-3" />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4 text-xs">
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e8e7e4]">
                <div className="relative">
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#5645d4] ring-4 ring-white" />
                  <div className="font-medium text-[#37352f]">Document updated in Workspace</div>
                  <div className="text-[#9b9a97] mt-0.5">{item.lastUpdated} by {item.author.name}</div>
                </div>
                <div className="relative">
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#1aae39] ring-4 ring-white" />
                  <div className="font-medium text-[#37352f]">Security policy scan passed</div>
                  <div className="text-[#9b9a97] mt-0.5">Automated SOC-2 scanner - 0 alerts</div>
                </div>
                <div className="relative">
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#9b9a97] ring-4 ring-white" />
                  <div className="font-medium text-[#37352f]">Initial draft created</div>
                  <div className="text-[#9b9a97] mt-0.5">Version {item.version || 'v1'} initialized</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 border-t border-[#e8e7e4] bg-[#fafaf9] flex items-center justify-between">
          <button
            onClick={() => {
              if (window.confirm(`Delete "${item.title}"?`)) {
                onDeleteItem(item.id);
                onClose();
              }
            }}
            className="flex items-center gap-1 text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/40 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete publication</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-[#37352f] hover:bg-[#f0eeec] border border-[#e8e7e4] rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
