import React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import type { ContentStatus, ProjectId, SortOption } from '../../types';

interface StatusCountMap {
  all: number;
  draft: number;
  pending: number;
  approved: number;
  published: number;
}

interface ContentFiltersProps {
  currentStatus: ContentStatus;
  onSelectStatus: (status: ContentStatus) => void;
  statusCounts: StatusCountMap;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedProject: ProjectId;
  onSelectProject: (proj: ProjectId) => void;
  selectedSort: SortOption;
  onSelectSort: (sort: SortOption) => void;
  onResetFilters: () => void;
}

export const ContentFilters: React.FC<ContentFiltersProps> = ({
  currentStatus,
  onSelectStatus,
  statusCounts,
  searchQuery,
  onSearchChange,
  selectedProject,
  onSelectProject,
  selectedSort,
  onSelectSort,
  onResetFilters,
}) => {
  const tabs: { key: ContentStatus; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: statusCounts.all },
    { key: 'draft', label: 'Draft', count: statusCounts.draft },
    { key: 'pending', label: 'Pending Approval', count: statusCounts.pending },
    { key: 'approved', label: 'Approved', count: statusCounts.approved },
    { key: 'published', label: 'Published', count: statusCounts.published },
  ];

  const hasActiveFilters =
    currentStatus !== 'all' || selectedProject !== 'all' || searchQuery.trim().length > 0;

  const getActiveFilterSummary = () => {
    const parts: string[] = [];
    if (currentStatus !== 'all') {
      const tabObj = tabs.find((t) => t.key === currentStatus);
      parts.push(`Status: ${tabObj?.label || currentStatus}`);
    }
    if (selectedProject !== 'all') {
      const projNames: Record<string, string> = {
        'core-cms': 'Enterprise Core CMS',
        security: 'Security & Architecture',
        mobile: 'Design System Mobile',
        cloud: 'Cloud Infrastructure',
      };
      parts.push(`Project: ${projNames[selectedProject] || selectedProject}`);
    }
    if (searchQuery.trim()) {
      parts.push(`Query: "${searchQuery}"`);
    }
    return parts.join(' • ');
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Status Tabs */}
      <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2 scrollbar-none">
        <div
          id="statusTabs"
          className="flex items-center gap-1.5 bg-[#fafaf9] p-1 rounded-xl shadow-2xs border border-[#e8e7e4] flex-nowrap"
        >
          {tabs.map((tab) => {
            const isActive = currentStatus === tab.key;
            return (
              <button
                key={tab.key}
                id={`status-tab-${tab.key}`}
                onClick={() => onSelectStatus(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all flex items-center whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#37352f] text-white shadow-xs'
                    : 'text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#37352f]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`ml-1.5 text-[11px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[#f0eeec] text-[#787671]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls row: Search + Project Filter + Sort */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9a97] w-4 h-4 pointer-events-none" />
          <input
            id="searchInput"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search content by title or slug..."
            className="w-full pl-9 pr-8 py-2 bg-[#fafaf9] focus:bg-white border border-[#e8e7e4] focus:border-[#5645d4]/40 rounded-lg text-[13px] text-[#37352f] outline-none placeholder:text-[#9b9a97] shadow-2xs transition-all focus:shadow-sm"
          />
          {searchQuery && (
            <button
              id="clearSearch"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9b9a97] hover:text-[#37352f] p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Project Filter */}
          <div className="relative">
            <select
              id="projectSelect"
              value={selectedProject}
              onChange={(e) => onSelectProject(e.target.value as ProjectId)}
              className="appearance-none bg-[#fafaf9] hover:bg-[#f0eeec] border border-[#e8e7e4] text-[#37352f] text-[13px] font-medium py-2 pl-3 pr-8 rounded-lg outline-none cursor-pointer shadow-2xs transition-colors"
            >
              <option value="all">Project: All Projects</option>
              <option value="core-cms">Enterprise Core CMS</option>
              <option value="security">Security &amp; Architecture</option>
              <option value="mobile">Design System Mobile</option>
              <option value="cloud">Cloud Infrastructure</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9b9a97] w-4 h-4" />
          </div>

          {/* Sort Filter */}
          <div className="relative">
            <select
              id="sortSelect"
              value={selectedSort}
              onChange={(e) => onSelectSort(e.target.value as SortOption)}
              className="appearance-none bg-[#fafaf9] hover:bg-[#f0eeec] border border-[#e8e7e4] text-[#37352f] text-[13px] font-medium py-2 pl-3 pr-8 rounded-lg outline-none cursor-pointer shadow-2xs transition-colors"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="alphabetical">Sort: Title A–Z</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9b9a97] w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {hasActiveFilters && (
        <div
          id="filterTagsRow"
          className="flex items-center gap-2 flex-wrap text-xs text-[#5d5b54] pt-1"
        >
          <span>Filtered by:</span>
          <span
            id="activeFilterBadge"
            className="inline-flex items-center gap-1 bg-[#e4e9ec] px-2.5 py-0.5 rounded text-[#37352f] font-medium"
          >
            {getActiveFilterSummary()}
          </span>
          <button
            id="resetAllFilters"
            onClick={onResetFilters}
            className="text-[#0075de] hover:underline text-xs ml-1 cursor-pointer font-medium"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};
