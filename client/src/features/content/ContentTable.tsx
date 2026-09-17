import React, { useState } from 'react';
import {
  FileText,
  Shield,
  Palette,
  Terminal,
  CheckCircle2,
  MoreHorizontal,
  SearchX,
  ExternalLink,
  Trash2,
  Copy,
  Clock,
  User,
} from 'lucide-react';
import type { ContentItem, ViewStateMode } from '../../types';

interface ContentTableProps {
  items: ContentItem[];
  viewMode: ViewStateMode;
  onSelectItem: (item: ContentItem) => void;
  onResetFilters: () => void;
  onDeleteItem: (id: string) => void;
  onChangeItemStatus: (id: string, newStatus: ContentItem['status']) => void;
  onShowToast: (title: string, subtitle?: string) => void;
}

export const ContentTable: React.FC<ContentTableProps> = ({
  items,
  viewMode,
  onSelectItem,
  onResetFilters,
  onDeleteItem,
  onChangeItemStatus,
  onShowToast,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getIconComponent = (icon: ContentItem['icon']) => {
    switch (icon) {
      case 'article':
        return FileText;
      case 'shield':
        return Shield;
      case 'palette':
        return Palette;
      case 'description':
        return FileText;
      case 'terminal':
        return Terminal;
      case 'verified':
        return CheckCircle2;
      default:
        return FileText;
    }
  };

  const getStatusBadge = (status: ContentItem['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ffe8d4] text-[#dd5b00]">
            Pending Approval
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#d9f3e1] text-[#1aae39]">
            Approved
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f0eeec] text-[#5d5b54]">
            Draft
          </span>
        );
      case 'published':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6e0f5] text-[#5645d4]">
            Published
          </span>
        );
    }
  };

  // 1. SKELETON STATE
  if (viewMode === 'skeleton') {
    return (
      <div
        id="skeletonContainer"
        className="bg-[#fafaf9] rounded-xl shadow-2xs border border-[#e8e7e4] overflow-hidden flex flex-col"
      >
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="p-4 bg-white border-b border-[#f1efed] flex items-center justify-between animate-pulse"
          >
            <div className="flex items-center gap-3 w-1/3">
              <div className="w-7 h-7 rounded bg-[#e4e9ec]"></div>
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-3.5 bg-[#e4e9ec] rounded w-3/4"></div>
                <div className="h-2.5 bg-[#eaeef2] rounded w-1/2"></div>
              </div>
            </div>
            <div className="w-24 h-5 bg-[#e4e9ec] rounded-full"></div>
            <div className="flex items-center gap-2 w-28">
              <div className="w-6 h-6 rounded-full bg-[#e4e9ec]"></div>
              <div className="h-3 bg-[#e4e9ec] rounded w-14"></div>
            </div>
            <div className="w-20 h-3 bg-[#e4e9ec] rounded"></div>
            <div className="w-5 h-5 bg-[#e4e9ec] rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // 2. EMPTY STATE
  if (viewMode === 'empty' || items.length === 0) {
    return (
      <div
        id="emptyContainer"
        className="bg-white rounded-xl shadow-2xs border border-[#e8e7e4] flex flex-col items-center justify-center p-12 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#f0eeec] flex items-center justify-center text-[#5d5b54] mb-3">
          <SearchX className="w-7 h-7" />
        </div>
        <h3 className="text-[18px] font-semibold text-[#37352f]">No content found</h3>
        <p className="text-[14px] text-[#5d5b54] max-w-sm mt-1 mb-4">
          There are no articles or documents matching the selected filters or search terms.
        </p>
        <button
          id="emptyResetBtn"
          onClick={onResetFilters}
          className="px-3.5 py-1.5 rounded-lg bg-[#e4e9ec] hover:bg-[#dfe3e7] text-[#37352f] text-[13px] font-medium shadow-2xs transition-all cursor-pointer"
        >
          Clear all filters
        </button>
      </div>
    );
  }

  // 3. NORMAL CONTENT LIST
  return (
    <div
      id="itemsContainer"
      className="bg-[#fafaf9] rounded-xl shadow-2xs border border-[#e8e7e4] overflow-hidden flex flex-col"
    >
      {/* Table Header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2.5 bg-[#f7f6f5] border-b border-[#e8e7e4] text-[11px] font-semibold text-[#9b9a97] uppercase tracking-wider select-none">
        <div className="col-span-5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          <span>Title &amp; Slug</span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border border-current"></span>
          <span>Status</span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          <span>Author</span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Last Updated</span>
        </div>
        <div className="col-span-1 text-right flex items-center justify-end gap-1">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#f1efed]">
        {items.map((item) => {
          const IconComp = getIconComponent(item.icon);
          const isMenuOpen = activeMenuId === item.id;

          return (
            <div
              key={item.id}
              id={`content-row-${item.id}`}
              onClick={() => onSelectItem(item)}
              className="content-row group grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 md:py-3.5 md:px-4 bg-white hover:bg-[#f0f4f8] transition-colors cursor-pointer items-center relative"
            >
              {/* Title & Slug */}
              <div className="md:col-span-5 flex items-start gap-3 min-w-0">
                <div
                  className={`w-7 h-7 mt-0.5 rounded ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}
                >
                  <IconComp className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-medium text-[#37352f] group-hover:text-[#5645d4] transition-colors truncate">
                      {item.title}
                    </span>
                    {item.version && (
                      <span className="px-1.5 py-0.2 rounded text-[11px] font-normal bg-[#e4e9ec] text-[#5d5b54]">
                        {item.version}
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] text-[#9b9a97] truncate font-mono">
                    {item.slug}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="md:col-span-2 flex items-center">
                {getStatusBadge(item.status)}
              </div>

              {/* Author */}
              <div className="md:col-span-2 flex items-center gap-2">
                {item.author.avatarUrl ? (
                  <img
                    src={item.author.avatarUrl}
                    alt={item.author.name}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover border border-[#e8e7e4]"
                  />
                ) : (
                  <div
                    className={`w-6 h-6 rounded-full ${item.author.avatarBg} ${item.author.textColor} text-[11px] font-semibold flex items-center justify-center`}
                  >
                    {item.author.initials}
                  </div>
                )}
                <span className="text-[13px] text-[#37352f] truncate">
                  {item.author.name}
                </span>
              </div>

              {/* Last Updated */}
              <div className="md:col-span-2 flex items-center text-[#9b9a97] text-[13px]">
                <span>{item.lastUpdated}</span>
              </div>

              {/* Row Action Menu */}
              <div
                className="md:col-span-1 flex items-center justify-end"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <button
                    id={`action-menu-${item.id}`}
                    onClick={() => setActiveMenuId(isMenuOpen ? null : item.id)}
                    className="p-1 rounded hover:bg-[#f0eeec] text-[#9b9a97] hover:text-[#37352f] transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {isMenuOpen && (
                    <div
                      className="absolute right-0 top-7 w-44 bg-white border border-[#e8e7e4] rounded-xl shadow-xl z-30 p-1 animate-in fade-in zoom-in-95 duration-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          onSelectItem(item);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#37352f] hover:bg-[#f0f4f8] rounded-md transition-colors text-left"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#5d5b54]" />
                        <span>Open Reader</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          navigator.clipboard?.writeText(item.slug);
                          onShowToast('Slug Copied', item.slug);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#37352f] hover:bg-[#f0f4f8] rounded-md transition-colors text-left"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#5d5b54]" />
                        <span>Copy URL Slug</span>
                      </button>

                      <div className="my-1 border-t border-[#f1efed]"></div>
                      <div className="px-2 py-0.5 text-[10px] font-semibold text-[#9b9a97] uppercase">
                        Change Status
                      </div>

                      <div className="grid grid-cols-2 gap-1 p-1">
                        {(['draft', 'pending', 'approved', 'published'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              onChangeItemStatus(item.id, st);
                              setActiveMenuId(null);
                            }}
                            className={`px-1.5 py-1 rounded text-[10px] font-medium capitalize text-left transition-colors ${
                              item.status === st
                                ? 'bg-[#5645d4] text-white'
                                : 'bg-[#f0eeec] text-[#5d5b54] hover:bg-[#dfe3e7]'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      <div className="my-1 border-t border-[#f1efed]"></div>

                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          onDeleteItem(item.id);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-md transition-colors text-left"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Item</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
