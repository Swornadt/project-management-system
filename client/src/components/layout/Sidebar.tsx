import React, { useState } from 'react';
import {
  Search,
  Clock,
  TrendingUp,
  Map,
  Zap,
  FileText,
  Kanban,
  ShieldCheck,
  ChevronsUpDown,
  MoreHorizontal,
  X,
  Check,
  Settings,
  LogOut,
  Bell,
} from 'lucide-react';
import type { ActiveNavKey } from '../../types';
import { ELEANOR_VANCE_AVATAR } from '../../data/mockContent';

interface SidebarProps {
  activeNav: ActiveNavKey;
  onSelectNav: (nav: ActiveNavKey) => void;
  onOpenSearch: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenUpdates?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onSelectNav,
  onOpenSearch,
  isOpenMobile,
  onCloseMobile,
  onOpenUpdates,
}) => {
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState('Acme Global Operations');

  const workspaces = [
    { name: 'Acme Global Operations', icon: 'A', bg: 'bg-[#ffe8d4]', desc: 'Primary Headquarters' },
    { name: 'Acme APAC Engineering', icon: 'AP', bg: 'bg-[#dcecfa]', desc: 'Tokyo & Singapore' },
    { name: 'Acme EMEA Platform', icon: 'EM', bg: 'bg-[#d9f3e1]', desc: 'London & Dublin' },
  ];

  const handleNavClick = (key: ActiveNavKey) => {
    onSelectNav(key);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed left-0 top-0 h-full w-64 bg-[#fafaf9] z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-[#e8e7e4] transition-transform duration-200 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto px-2 py-3">
          {/* Mobile close button */}
          <div className="flex lg:hidden items-center justify-between px-2 pb-2 mb-1 border-b border-[#e8e7e4]">
            <span className="text-xs font-semibold text-[#9b9a97] uppercase tracking-wider">Workspace Menu</span>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-md text-[#5d5b54] hover:bg-[#f0eeec]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Workspace Switcher */}
          <div className="relative px-2 mb-3">
            <button
              id="workspace-switcher-btn"
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#f0eeec] hover:text-[#171c1f] cursor-pointer transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-[#ffe8d4] text-[#37352f] text-xs font-bold shrink-0">
                  {currentWorkspace === 'Acme Global Operations' ? 'A' : currentWorkspace.charAt(0)}
                </div>
                <span className="text-[13px] font-medium text-[#37352f] truncate">
                  {currentWorkspace}
                </span>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#5d5b54] shrink-0" />
            </button>

            {/* Workspace Dropdown */}
            {workspaceMenuOpen && (
              <div
                className="absolute left-2 right-2 top-11 bg-white border border-[#e8e7e4] rounded-xl shadow-lg z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[11px] font-semibold text-[#9b9a97] uppercase tracking-wider">
                  Switch Workspace
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.name}
                    onClick={() => {
                      setCurrentWorkspace(ws.name);
                      setWorkspaceMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left hover:bg-[#f0f4f8] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${ws.bg} text-[11px] font-bold text-[#37352f]`}>
                        {ws.icon}
                      </div>
                      <div>
                        <div className="text-[12px] font-medium text-[#37352f]">{ws.name}</div>
                        <div className="text-[10px] text-[#9b9a97]">{ws.desc}</div>
                      </div>
                    </div>
                    {currentWorkspace === ws.name && <Check className="w-3.5 h-3.5 text-[#5645d4]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search and Updates Quick Links */}
          <div className="px-2 mb-3 flex flex-col gap-0.5">
            <button
              id="sidebar-search-btn"
              onClick={onOpenSearch}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#171c1f] transition-colors text-[13px] text-left"
            >
              <Search className="w-4 h-4 text-[#787671]" />
              <span>Search</span>
              <span className="ml-auto text-[11px] text-[#9b9a97] bg-[#ffffff] border border-[#e8e7e4] px-1 rounded shadow-2xs">
                ⌘K
              </span>
            </button>
            <button
              id="sidebar-updates-btn"
              onClick={onOpenUpdates}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#171c1f] transition-colors text-[13px] text-left"
            >
              <Clock className="w-4 h-4 text-[#787671]" />
              <span>Updates</span>
              <span className="ml-auto w-2 h-2 rounded-full bg-[#5645d4]"></span>
            </button>
          </div>

          {/* Favorites Header */}
          <div className="px-2 pt-2 pb-1">
            <span className="text-[11px] font-semibold text-[#9b9a97] tracking-wider uppercase">
              Favorites
            </span>
          </div>
          <nav className="flex flex-col gap-0.5 mb-3">
            <button
              id="nav-executive-overview"
              onClick={() => handleNavClick('executive-overview')}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-[13px] text-left ${
                activeNav === 'executive-overview'
                  ? 'bg-[#f0eeec] text-[#171c1f] font-medium'
                  : 'text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#171c1f]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Executive Overview</span>
            </button>
            <button
              id="nav-projects-roadmaps"
              onClick={() => handleNavClick('projects-and-roadmaps')}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-[13px] text-left ${
                activeNav === 'projects-and-roadmaps'
                  ? 'bg-[#f0eeec] text-[#171c1f] font-medium'
                  : 'text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#171c1f]'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Projects &amp; Roadmaps</span>
            </button>
            <button
              id="nav-sprint-planner"
              onClick={() => handleNavClick('sprint-planner')}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-[13px] text-left ${
                activeNav === 'sprint-planner'
                  ? 'bg-[#f0eeec] text-[#171c1f] font-medium'
                  : 'text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#171c1f]'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Sprint Planner</span>
            </button>
          </nav>

          {/* Workspace Section Header */}
          <div className="px-2 pt-2 pb-1">
            <span className="text-[11px] font-semibold text-[#9b9a97] tracking-wider uppercase">
              Workspace
            </span>
          </div>
          <nav className="flex flex-col gap-0.5">
            <button
              id="nav-content-publishing"
              onClick={() => handleNavClick('content-publishing')}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-[13px] text-left ${
                activeNav === 'content-publishing'
                  ? 'bg-[#f0eeec] text-[#171c1f] font-medium shadow-2xs'
                  : 'text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#171c1f]'
              }`}
            >
              <FileText className="w-4 h-4 text-[#5645d4]" />
              <span>Content Publishing</span>
            </button>
            <button
              id="nav-task-kanban"
              onClick={() => handleNavClick('task-kanban-board')}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-[13px] text-left ${
                activeNav === 'task-kanban-board'
                  ? 'bg-[#f0eeec] text-[#171c1f] font-medium shadow-2xs'
                  : 'text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#171c1f]'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span>Task Kanban Board</span>
            </button>
            <button
              id="nav-approvals"
              onClick={() => handleNavClick('approvals-and-governance')}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-[13px] text-left ${
                activeNav === 'approvals-and-governance'
                  ? 'bg-[#f0eeec] text-[#171c1f] font-medium shadow-2xs'
                  : 'text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#171c1f]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approvals &amp; Governance</span>
            </button>
          </nav>
        </div>

        {/* User Footer Profile */}
        <div className="relative p-2 border-t border-[#e8e7e4]">
          <div
            id="user-profile-btn"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-[#f0eeec] hover:text-[#171c1f] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={ELEANOR_VANCE_AVATAR}
                alt="Eleanor Vance profile"
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-[#e8e7e4]"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-medium text-[#37352f] truncate leading-tight">
                  Eleanor Vance
                </span>
                <span className="text-[11px] text-[#9b9a97] truncate">Operations Lead</span>
              </div>
            </div>
            <MoreHorizontal className="w-4 h-4 text-[#787671]" />
          </div>

          {/* User popup menu */}
          {userMenuOpen && (
            <div
              className="absolute left-2 right-2 bottom-14 bg-white border border-[#e8e7e4] rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2.5 py-1.5 border-b border-[#f1efed]">
                <div className="text-[13px] font-semibold text-[#37352f]">Eleanor Vance</div>
                <div className="text-[11px] text-[#787671]">eleanor.vance@acme-global.org</div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#5d5b54] hover:bg-[#f0f4f8] rounded-md transition-colors text-left"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Account Settings</span>
                </button>
                <button
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#5d5b54] hover:bg-[#f0f4f8] rounded-md transition-colors text-left"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Notification Preferences</span>
                </button>
              </div>
              <div className="pt-1 border-t border-[#f1efed]">
                <button
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-md transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
