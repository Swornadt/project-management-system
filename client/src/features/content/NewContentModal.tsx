import React, { useState } from 'react';
import {
  X,
  FilePlus,
  FileText,
  Shield,
  Palette,
  Terminal,
  CheckCircle2,
} from 'lucide-react';
import type { ContentItem } from '../../types';
import { AUTHORS } from '../../data/mockContent';

interface NewContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateItem: (item: ContentItem) => void;
}

export const NewContentModal: React.FC<NewContentModalProps> = ({
  isOpen,
  onClose,
  onCreateItem,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [project, setProject] = useState('core-cms');
  const [status, setStatus] = useState<ContentItem['status']>('draft');
  const [authorKey, setAuthorKey] = useState<keyof typeof AUTHORS>('eleanor');
  const [version, setVersion] = useState('v1');
  const [icon, setIcon] = useState<ContentItem['icon']>('article');
  const [summary, setSummary] = useState('');

  const projectMap: Record<string, string> = {
    'core-cms': 'Enterprise Core CMS',
    security: 'Security & Architecture',
    mobile: 'Design System Mobile',
    cloud: 'Cloud Infrastructure',
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    const generatedSlug =
      '/' +
      (project === 'core-cms'
        ? 'announcements'
        : project === 'security'
        ? 'security'
        : project === 'mobile'
        ? 'design'
        : 'infrastructure') +
      '/' +
      val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    setSlug(generatedSlug);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let iconBg = 'bg-[#dcecfa]';
    let iconColor = 'text-[#0075de]';
    if (icon === 'shield') {
      iconBg = 'bg-[#d9f3e1]';
      iconColor = 'text-[#1aae39]';
    } else if (icon === 'palette') {
      iconBg = 'bg-[#fef7d6]';
      iconColor = 'text-[#743300]';
    } else if (icon === 'terminal') {
      iconBg = 'bg-[#ffe8d4]';
      iconColor = 'text-[#dd5b00]';
    } else if (icon === 'verified') {
      iconBg = 'bg-[#d9f3e1]';
      iconColor = 'text-[#1aae39]';
    } else if (icon === 'description') {
      iconBg = 'bg-[#e6e0f5]';
      iconColor = 'text-[#5645d4]';
    }

    const newItem: ContentItem = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      slug: slug || `/docs/${title.toLowerCase().replace(/\s+/g, '-')}`,
      version: version.trim() || undefined,
      project,
      projectName: projectMap[project] || 'Enterprise Core CMS',
      status,
      author: AUTHORS[authorKey] || AUTHORS.eleanor,
      lastUpdated: 'Just now',
      timestampHours: 0.01,
      icon,
      iconBg,
      iconColor,
      summary: summary.trim() || 'New enterprise documentation created in workspace.',
      body: `### ${title}\n${summary || 'Initial draft documentation initialized.'}\n\n- Scope: ${projectMap[project]}\n- Author: ${AUTHORS[authorKey].name}`,
      views: 1,
      tags: [projectMap[project]],
    };

    onCreateItem(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#e8e7e4] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e8e7e4] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#e6e0f5] text-[#5645d4] flex items-center justify-center">
              <FilePlus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-[#37352f]">Create New Content</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9b9a97] hover:text-[#37352f] hover:bg-[#f0eeec] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-[#5d5b54] block mb-1">
              Title <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Edge Compute Worker Migration Guidelines"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full text-[13px] px-3 py-2 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4] shadow-2xs"
            />
          </div>

          <div>
            <label className="font-semibold text-[#5d5b54] block mb-1">URL Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="/announcements/my-new-post"
              className="w-full text-xs font-mono px-3 py-2 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4] bg-[#f7f6f5]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#5d5b54] block mb-1">Target Project</label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg bg-white outline-none focus:border-[#5645d4]"
              >
                <option value="core-cms">Enterprise Core CMS</option>
                <option value="security">Security &amp; Architecture</option>
                <option value="mobile">Design System Mobile</option>
                <option value="cloud">Cloud Infrastructure</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#5d5b54] block mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentItem['status'])}
                className="w-full text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg bg-white outline-none focus:border-[#5645d4]"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#5d5b54] block mb-1">Author</label>
              <select
                value={authorKey}
                onChange={(e) => setAuthorKey(e.target.value as keyof typeof AUTHORS)}
                className="w-full text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg bg-white outline-none focus:border-[#5645d4]"
              >
                <option value="eleanor">Eleanor Vance (Operations Lead)</option>
                <option value="emily">Emily Watson</option>
                <option value="sarah">Sarah Jenkins</option>
                <option value="david">David Kim</option>
                <option value="marcus">Marcus Chen</option>
                <option value="elena">Elena Rostova</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#5d5b54] block mb-1">Version Tag</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1"
                className="w-full text-xs px-3 py-2 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#5d5b54] block mb-1">Icon Category</label>
            <div className="grid grid-cols-6 gap-2">
              {[
                { id: 'article', label: 'Article', icon: FileText },
                { id: 'shield', label: 'Security', icon: Shield },
                { id: 'palette', label: 'Design', icon: Palette },
                { id: 'description', label: 'Doc', icon: FileText },
                { id: 'terminal', label: 'Dev', icon: Terminal },
                { id: 'verified', label: 'Audit', icon: CheckCircle2 },
              ].map((ic) => {
                const IconComponent = ic.icon;
                const isSelected = icon === ic.id;
                return (
                  <button
                    key={ic.id}
                    type="button"
                    onClick={() => setIcon(ic.id as ContentItem['icon'])}
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'border-[#5645d4] bg-[#e6e0f5] text-[#5645d4]'
                        : 'border-[#e8e7e4] text-[#5d5b54] hover:bg-[#f0f4f8]'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-[10px]">{ic.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#5d5b54] block mb-1">Summary / Abstract</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of this publication..."
              className="w-full text-xs p-2.5 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4]"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-[#e8e7e4] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[#5d5b54] hover:bg-[#f0eeec] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 text-xs font-medium bg-[#5645d4] hover:bg-[#4534b3] text-white rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              Create Publication
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
