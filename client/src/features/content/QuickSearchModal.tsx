import React, { useState, useEffect } from 'react';
import { Search, X, FileText, ArrowRight, CornerDownLeft } from 'lucide-react';
import type { ContentItem, ActiveNavKey } from '../../types';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ContentItem[];
  onSelectItem: (item: ContentItem) => void;
  onSelectNav: (nav: ActiveNavKey) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectItem,
  onSelectNav,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or toggle
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = query.trim()
    ? items.filter(
        (it) =>
          it.title.toLowerCase().includes(query.toLowerCase()) ||
          it.slug.toLowerCase().includes(query.toLowerCase()) ||
          it.projectName.toLowerCase().includes(query.toLowerCase())
      )
    : items.slice(0, 7);

  const quickNavs: { key: ActiveNavKey; label: string; section: string }[] = [
    { key: 'content-publishing', label: 'Content Publishing', section: 'Workspace' },
    { key: 'task-kanban-board', label: 'Task Kanban Board', section: 'Workspace' },
    { key: 'approvals-and-governance', label: 'Approvals & Governance', section: 'Workspace' },
    { key: 'executive-overview', label: 'Executive Overview', section: 'Favorites' },
    { key: 'projects-and-roadmaps', label: 'Projects & Roadmaps', section: 'Favorites' },
    { key: 'sprint-planner', label: 'Sprint Planner', section: 'Favorites' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#e8e7e4] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-[#e8e7e4] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#9b9a97]" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a title, slug, or workspace section..."
            className="flex-1 text-sm text-[#37352f] outline-none placeholder:text-[#9b9a97]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-[#9b9a97] hover:text-[#37352f]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[11px] text-[#9b9a97] bg-[#f7f6f5] px-2 py-0.5 rounded border border-[#e8e7e4]">
            ESC to close
          </span>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[#f1efed]">
          {/* Quick Jump Sections */}
          {!query && (
            <div className="pb-2">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#9b9a97] uppercase tracking-wider">
                Jump to View
              </div>
              <div className="grid grid-cols-2 gap-1 px-1">
                {quickNavs.map((nav) => (
                  <button
                    key={nav.key}
                    onClick={() => {
                      onSelectNav(nav.key);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2 rounded-lg text-xs text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#37352f] transition-colors text-left"
                  >
                    <span>{nav.label}</span>
                    <ArrowRight className="w-3 h-3 text-[#9b9a97]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Articles Section */}
          <div className="pt-2">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-[#9b9a97] uppercase tracking-wider">
              {query ? `Search Results (${filtered.length})` : 'Recent Publications'}
            </div>

            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#9b9a97]">
                No matching publications found for "{query}"
              </div>
            ) : (
              <div className="space-y-0.5 px-1">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectItem(item);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#f0f4f8] transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#37352f] group-hover:text-[#5645d4] truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#9b9a97] font-mono truncate">
                          {item.slug}
                        </div>
                      </div>
                    </div>
                    <CornerDownLeft className="w-3.5 h-3.5 text-[#9b9a97] opacity-0 group-hover:opacity-100 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
