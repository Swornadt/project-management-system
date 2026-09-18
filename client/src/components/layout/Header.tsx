import React, { useState } from 'react';
import {
  Menu,
  Search,
  Share2,
  Star,
  MoreHorizontal,
  Download,
  Printer,
  Copy,
} from 'lucide-react';
import type { ActiveNavKey } from '../../types';
import { ELEANOR_VANCE_AVATAR } from '../../data/mockContent';

interface HeaderProps {
  activeNav: ActiveNavKey;
  onOpenMobileSidebar: () => void;
  onOpenSearch: () => void;
  onShowToast: (title: string, subtitle?: string) => void;
}

const NAV_TITLES: Record<ActiveNavKey, { parent: string; title: string }> = {
  'content-publishing': { parent: 'Workspace', title: 'Content Publishing' },
  'task-kanban-board': { parent: 'Workspace', title: 'Task Kanban Board' },
  'approvals-and-governance': { parent: 'Workspace', title: 'Approvals & Governance' },
  'executive-overview': { parent: 'Favorites', title: 'Executive Overview' },
  'projects-and-roadmaps': { parent: 'Favorites', title: 'Projects & Roadmaps' },
  'sprint-planner': { parent: 'Favorites', title: 'Sprint Planner' },
};

export const Header: React.FC<HeaderProps> = ({
  activeNav,
  onOpenMobileSidebar,
  onOpenSearch,
  onShowToast,
}) => {
  const [isStarred, setIsStarred] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentNav = NAV_TITLES[activeNav] || { parent: 'Workspace', title: 'Content Publishing' };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    onShowToast('Workspace Link Copied', 'Shared URL has been copied to your clipboard.');
  };

  const handleStar = () => {
    const nextStarred = !isStarred;
    setIsStarred(nextStarred);
    onShowToast(
      nextStarred ? 'Added to Favorites' : 'Removed from Favorites',
      `${currentNav.title} pinned status updated.`
    );
  };

  return (
    <header
      id="app-header"
      className="fixed top-0 left-0 lg:left-64 right-0 h-14 bg-white/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#e8e7e4] z-40 flex items-center justify-between px-4 lg:px-8 transition-all"
    >
      {/* Left: Hamburger (mobile) + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-toggle-btn"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-1.5 rounded-lg text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#171c1f] transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-[13px] text-[#5d5b54] truncate">
          <span className="hover:text-[#37352f] cursor-pointer hidden sm:inline">
            Acme Global Operations
          </span>
          <span className="text-[#9b9a97] hidden sm:inline">/</span>
          <span className="hover:text-[#37352f] cursor-pointer text-[#787671]">
            {currentNav.parent}
          </span>
          <span className="text-[#9b9a97]">/</span>
          <span className="text-[#37352f] font-medium truncate">
            {currentNav.title}
          </span>
        </div>
      </div>

      {/* Right: Quick Search input + action icons + profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search doc trigger */}
        <button
          id="header-search-box"
          onClick={onOpenSearch}
          className="flex items-center gap-2 bg-[#f7f6f5] hover:bg-[#eaeef2] border border-[#e8e7e4] px-3 py-1.5 rounded-lg text-[#5d5b54] w-44 sm:w-64 transition-all text-left group"
        >
          <Search className="w-4 h-4 text-[#9b9a97] group-hover:text-[#37352f]" />
          <span className="text-[13px] text-[#9b9a97] truncate">
            Search doc or jump to...
          </span>
          <span className="ml-auto text-[11px] text-[#9b9a97] bg-white px-1.5 py-0.5 rounded border border-[#e8e7e4] shadow-2xs">
            ⌘K
          </span>
        </button>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1 text-[#5d5b54]">
          <button
            id="share-btn"
            onClick={handleShare}
            title="Share document link"
            className="p-1.5 rounded-lg hover:bg-[#f0eeec] hover:text-[#171c1f] transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            id="favorite-toggle-btn"
            onClick={handleStar}
            title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
            className={`p-1.5 rounded-lg hover:bg-[#f0eeec] transition-colors ${
              isStarred ? 'text-[#f5d75e] hover:text-[#e0b822]' : 'hover:text-[#171c1f]'
            }`}
          >
            <Star className={`w-4 h-4 ${isStarred ? 'fill-[#f5d75e]' : ''}`} />
          </button>

          {/* More options dropdown */}
          <div className="relative">
            <button
              id="header-more-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              title="More workspace actions"
              className="p-1.5 rounded-lg hover:bg-[#f0eeec] hover:text-[#171c1f] transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-9 w-48 bg-white border border-[#e8e7e4] rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onShowToast('Exporting Workspace', 'Generating JSON & Markdown archive...');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#37352f] hover:bg-[#f0f4f8] rounded-md transition-colors text-left"
                >
                  <Download className="w-3.5 h-3.5 text-[#5d5b54]" />
                  <span>Export all as Markdown</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    window.print();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#37352f] hover:bg-[#f0f4f8] rounded-md transition-colors text-left"
                >
                  <Printer className="w-3.5 h-3.5 text-[#5d5b54]" />
                  <span>Print View</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleShare();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#37352f] hover:bg-[#f0f4f8] rounded-md transition-colors text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-[#5d5b54]" />
                  <span>Copy Page Link</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* User profile avatar */}
        <img
          src={ELEANOR_VANCE_AVATAR}
          alt="Eleanor Vance"
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-full object-cover border border-[#e8e7e4] cursor-pointer hover:ring-2 hover:ring-[#5645d4]/40 transition-all shrink-0"
          title="Eleanor Vance (Operations Lead)"
        />
      </div>
    </header>
  );
};
