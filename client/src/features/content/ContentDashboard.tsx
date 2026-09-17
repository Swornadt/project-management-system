import { useState, useMemo } from 'react';
import { SlidersHorizontal, Plus, ChevronDown, RefreshCw } from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { MetricsCards } from './MetricsCards';
import { ViewModeDrawer } from './ViewModeDrawer';
import { ContentFilters } from './ContentFilters';
import { ContentTable } from './ContentTable';
import { ArticleDrawer } from './ArticleDrawer';
import { NewContentModal } from './NewContentModal';
import { QuickSearchModal } from './QuickSearchModal';
import { Toast } from '../../components/layout/Toast';
import { OtherViews } from './OtherViews';
import { INITIAL_CONTENT_ITEMS } from '../../data/mockContent';
import type {
  ContentItem,
  ContentStatus,
  ProjectId,
  SortOption,
  ViewStateMode,
  ActiveNavKey,
} from '../../types';

export const ContentDashboard = () => {
  // Navigation
  const [activeNav, setActiveNav] = useState<ActiveNavKey>('content-publishing');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Content state
  const [allItems, setAllItems] = useState<ContentItem[]>(INITIAL_CONTENT_ITEMS);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  // Filter and view controls
  const [currentStatus, setCurrentStatus] = useState<ContentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectId>('all');
  const [selectedSort, setSelectedSort] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewStateMode>('normal');
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);

  // Pagination / Display limit
  const [displayLimit, setDisplayLimit] = useState(6);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Modals & Drawers
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{
    open: boolean;
    title: string;
    subtitle?: string;
  }>({
    open: false,
    title: '',
    subtitle: '',
  });

  const showToast = (title: string, subtitle?: string) => {
    setToast({ open: true, title, subtitle });
  };

  // Status Counts
  const statusCounts = useMemo(() => {
    return {
      all: allItems.length,
      draft: allItems.filter((i) => i.status === 'draft').length,
      pending: allItems.filter((i) => i.status === 'pending').length,
      approved: allItems.filter((i) => i.status === 'approved').length,
      published: allItems.filter((i) => i.status === 'published').length,
    };
  }, [allItems]);

  // Filtered & Sorted items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...allItems];

    // Status filter
    if (currentStatus !== 'all') {
      result = result.filter((it) => it.status === currentStatus);
    }

    // Project filter
    if (selectedProject !== 'all') {
      result = result.filter((it) => it.project === selectedProject);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.slug.toLowerCase().includes(q) ||
          it.projectName.toLowerCase().includes(q) ||
          it.author.name.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (selectedSort === 'newest') {
        return a.timestampHours - b.timestampHours;
      } else if (selectedSort === 'oldest') {
        return b.timestampHours - a.timestampHours;
      } else if (selectedSort === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [allItems, currentStatus, selectedProject, searchQuery, selectedSort]);

  // Visible items based on pagination
  const visibleItems = useMemo(() => {
    return filteredAndSortedItems.slice(0, displayLimit);
  }, [filteredAndSortedItems, displayLimit]);

  // Handlers
  const handleResetFilters = () => {
    setCurrentStatus('all');
    setSelectedProject('all');
    setSearchQuery('');
    setDisplayLimit(6);
    setViewMode('normal');
  };

  const handleSelectItem = (item: ContentItem) => {
    setSelectedItem(item);
    showToast(item.title, 'Opening in reader drawer...');
  };

  const handleCreateItem = (newItem: ContentItem) => {
    setAllItems((prev) => [newItem, ...prev]);
    showToast('Publication Created', `"${newItem.title}" added to ${newItem.projectName}`);
  };

  const handleUpdateItem = (updated: ContentItem) => {
    setAllItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
    setSelectedItem(updated);
  };

  const handleDeleteItem = (id: string) => {
    const target = allItems.find((i) => i.id === id);
    setAllItems((prev) => prev.filter((it) => it.id !== id));
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
    showToast('Document Deleted', target ? `Removed "${target.title}"` : 'Publication removed');
  };

  const handleChangeItemStatus = (id: string, newStatus: ContentItem['status']) => {
    setAllItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: newStatus, lastUpdated: 'Just now' } : it))
    );
    showToast('Status Updated', `Item moved to ${newStatus.toUpperCase()}`);
  };

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(allItems.length);
      setIsLoadingMore(false);
      showToast('All Content Loaded', `Showing all ${filteredAndSortedItems.length} records`);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#f7f6f5] text-[#37352f] flex">
      {/* Sidebar Navigation */}
      <Sidebar
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        onOpenSearch={() => setSearchModalOpen(true)}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenUpdates={() => showToast('System Updates', 'All 28 publications synced with edge CDN.')}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          activeNav={activeNav}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenSearch={() => setSearchModalOpen(true)}
          onShowToast={showToast}
        />

        {/* Page Content Body */}
        <main className="relative pt-14 w-full px-4 sm:px-8 bg-white min-h-[calc(100vh-3.5rem)]">
          <div className="max-w-[1240px] w-full mx-auto py-8 px-1 sm:px-4 flex flex-col gap-6">
            {activeNav === 'content-publishing' ? (
              <>
                {/* Top Breadcrumb & Page Meta Area */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#fafaf9] shadow-2xs border border-[#e8e7e4] flex items-center justify-center text-2xl select-none shrink-0">
                      📄
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h1 className="text-[28px] font-semibold text-[#37352f] tracking-tight">
                          Content
                        </h1>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f0eeec] text-[#5d5b54]">
                          Workspace
                        </span>
                      </div>
                      <p className="text-[14px] text-[#5d5b54] mt-1 max-w-2xl leading-relaxed">
                        Manage publications, documentation releases, marketing updates, and approvals across enterprise projects.
                      </p>
                    </div>
                  </div>

                  {/* Header Primary & Quick Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      id="demoModeToggle"
                      onClick={() => setViewDrawerOpen(!viewDrawerOpen)}
                      className="px-3 py-2 rounded-lg bg-[#fafaf9] hover:bg-[#f0eeec] text-[#5d5b54] text-[13px] font-medium transition-all flex items-center gap-1.5 shadow-2xs border border-[#e8e7e4] cursor-pointer"
                      title="Toggle Skeleton/Empty test states"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>View Modes</span>
                    </button>

                    <button
                      id="newContentBtn"
                      onClick={() => setNewModalOpen(true)}
                      className="px-3.5 py-2 rounded-lg bg-[#5645d4] hover:bg-[#4534b3] text-white text-[13px] font-medium shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New content</span>
                    </button>
                  </div>
                </div>

                {/* Quick Metrics Strip */}
                <MetricsCards
                  totalCount={statusCounts.all}
                  pendingCount={statusCounts.pending}
                  publishedCount={statusCounts.published}
                  draftCount={statusCounts.draft}
                  currentFilter={currentStatus}
                  onSelectFilter={setCurrentStatus}
                />

                {/* View Mode Switcher Tray */}
                <ViewModeDrawer
                  isOpen={viewDrawerOpen}
                  onClose={() => setViewDrawerOpen(false)}
                  currentMode={viewMode}
                  onChangeMode={setViewMode}
                />

                {/* Filter & Sort Bar Section */}
                <ContentFilters
                  currentStatus={currentStatus}
                  onSelectStatus={setCurrentStatus}
                  statusCounts={statusCounts}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedProject={selectedProject}
                  onSelectProject={setSelectedProject}
                  selectedSort={selectedSort}
                  onSelectSort={setSelectedSort}
                  onResetFilters={handleResetFilters}
                />

                {/* Main Content Presentation: Notion Database View */}
                <ContentTable
                  items={visibleItems}
                  viewMode={viewMode}
                  onSelectItem={handleSelectItem}
                  onResetFilters={handleResetFilters}
                  onDeleteItem={handleDeleteItem}
                  onChangeItemStatus={handleChangeItemStatus}
                  onShowToast={showToast}
                />

                {/* Bottom Pagination and Action Strip */}
                {viewMode === 'normal' && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-t border-[#f1efed]">
                    <div className="flex items-center gap-3">
                      <span id="counterStats" className="text-[13px] text-[#5d5b54]">
                        Showing {Math.min(visibleItems.length, filteredAndSortedItems.length)} of{' '}
                        {filteredAndSortedItems.length} articles
                      </span>
                      <span className="w-1 h-1 rounded-full bg-[#9b9a97]"></span>
                      <span className="text-[12px] text-[#9b9a97]">Cloud synchronized</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {visibleItems.length < filteredAndSortedItems.length ? (
                        <button
                          id="loadMoreBtn"
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                          className="px-3 py-1.5 rounded-lg bg-[#fafaf9] hover:bg-[#f0eeec] border border-[#e8e7e4] text-[#37352f] text-[13px] font-medium shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                        >
                          {isLoadingMore ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Loading...</span>
                            </>
                          ) : (
                            <>
                              <span>Load more</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-[#9b9a97] px-2 py-1">
                          All {filteredAndSortedItems.length} loaded
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Secondary Workspace Views */
              <OtherViews
                activeNav={activeNav}
                items={allItems}
                onOpenContentPublishing={() => setActiveNav('content-publishing')}
                onSelectItem={handleSelectItem}
              />
            )}
          </div>
        </main>
      </div>

      {/* Article Detail & Edit Slide-over Drawer */}
      <ArticleDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onShowToast={showToast}
      />

      {/* New Content Modal */}
      <NewContentModal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreateItem={handleCreateItem}
      />

      {/* Quick Search ⌘K Modal */}
      <QuickSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        items={allItems}
        onSelectItem={handleSelectItem}
        onSelectNav={setActiveNav}
      />

      {/* Interactive Toast Notification */}
      <Toast
        isOpen={toast.open}
        title={toast.title}
        subtitle={toast.subtitle}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}

export default ContentDashboard;