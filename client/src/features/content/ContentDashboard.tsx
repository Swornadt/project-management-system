import { useState, useMemo, useEffect } from 'react';
import { SlidersHorizontal, Plus, ChevronDown, RefreshCw } from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { MetricsCards } from './MetricsCards';
import { ViewModeDrawer } from './ViewModeDrawer';
import { ContentFilters } from './ContentFilters';
import { ContentTable } from './ContentTable';
import { ArticleDrawer } from './ArticleDrawer';
import { NewContentModal, type NewContentPayload } from './NewContentModal';
import { QuickSearchModal } from './QuickSearchModal';
import { Toast } from '../../components/layout/Toast';
import { OtherViews } from './OtherViews';
import { contentApi } from '../../api/axiosClient';
import {
  apiToContentItem,
  contentItemToUpdateDto,
} from './contentMapper';
import type {
  ContentItem,
  ContentStatus,
  ProjectId,
  SortOption,
  ViewStateMode,
  ActiveNavKey,
} from '../../types';

// STOPGAP: there's no auth or a real Projects API yet (both /users and
// /projects are commented out in server/index.ts), so there's no logged-in
// user and no real project to attach new content to. Set these to a real
// seeded project/user UUID from your dev database to actually create or
// review content end-to-end. Once auth exists, project_id/author_id should
// come from real context instead of env vars — replace this block then.
const DEV_PROJECT_ID = import.meta.env.VITE_DEV_PROJECT_ID as string | undefined;
const DEV_AUTHOR_ID = import.meta.env.VITE_DEV_AUTHOR_ID as string | undefined;
// Must differ from DEV_AUTHOR_ID — the backend 403s a reviewer approving
// their own content (content.service.ts's self-approval check).
const DEV_REVIEWER_ID = import.meta.env.VITE_DEV_REVIEWER_ID as string | undefined;

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

export const ContentDashboard = () => {
  // Navigation
  const [activeNav, setActiveNav] = useState<ActiveNavKey>('content-publishing');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Content state
  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  // Fetch content from the real API on mount. Sorting/filtering below still
  // happens client-side over this full set, same as before — only the
  // source of the data changed, not how the list/table consume it.
  useEffect(() => {
    let cancelled = false;
    contentApi
      .list({ limit: 200 })
      .then((res) => {
        if (cancelled) return;
        setAllItems(res.data.map(apiToContentItem));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleCreateItem = async (payload: NewContentPayload) => {
    if (!DEV_PROJECT_ID || !DEV_AUTHOR_ID) {
      throw new Error(
        'No project/author configured — set VITE_DEV_PROJECT_ID and VITE_DEV_AUTHOR_ID in .env (see the comment near the top of this file).'
      );
    }
    const res = await contentApi.create({
      project_id: DEV_PROJECT_ID,
      author_id: DEV_AUTHOR_ID,
      title: payload.title,
      slug: payload.slug,
      body: payload.body,
    });
    const created = apiToContentItem(res.data);
    setAllItems((prev) => [created, ...prev]);
    showToast('Publication Created', `"${created.title}" added`);
  };

  const handleSaveEdits = async (
    id: string,
    edits: { title: string; summary: string; body: string }
  ) => {
    const res = await contentApi.update(
      id,
      contentItemToUpdateDto({ title: edits.title, body: edits.body })
    );
    const updated = apiToContentItem(res.data);
    // summary has no backend field yet — keep it client-side so it isn't
    // silently dropped from the drawer until Content grows a real column.
    const merged = { ...updated, summary: edits.summary };
    setAllItems((prev) => prev.map((it) => (it.id === id ? merged : it)));
    setSelectedItem(merged);
  };

  const handleSubmitForApproval = async (id: string) => {
    const res = await contentApi.submitForApproval(id);
    const updated = apiToContentItem(res.data);
    setAllItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    setSelectedItem(updated);
  };

  const handleApprove = async (id: string) => {
    if (!DEV_REVIEWER_ID) {
      throw new Error('No reviewer configured — set VITE_DEV_REVIEWER_ID in .env.');
    }
    const res = await contentApi.decideApproval(id, {
      reviewer_id: DEV_REVIEWER_ID,
      decision: 'approved',
    });
    const updated = apiToContentItem(res.data);
    setAllItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    setSelectedItem(updated);
  };

  const handleReject = async (id: string, reason: string) => {
    if (!DEV_REVIEWER_ID) {
      throw new Error('No reviewer configured — set VITE_DEV_REVIEWER_ID in .env.');
    }
    const res = await contentApi.decideApproval(id, {
      reviewer_id: DEV_REVIEWER_ID,
      decision: 'rejected',
      reason,
    });
    // rejectionReason isn't in ApiContentResponse (GET doesn't return
    // approval history — see the note in contentMapper.ts), so it's applied
    // here from what we already know locally rather than dropped. It'll
    // survive until the next refetch, then disappear — a known gap.
    const updated = { ...apiToContentItem(res.data), rejectionReason: reason };
    setAllItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    setSelectedItem(updated);
  };

  const handlePublish = async (id: string) => {
    const res = await contentApi.publish(id);
    const updated = apiToContentItem(res.data);
    setAllItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    setSelectedItem(updated);
  };

  const handleDeleteItem = async (id: string) => {
    const target = allItems.find((i) => i.id === id);
    try {
      await contentApi.remove(id);
      setAllItems((prev) => prev.filter((it) => it.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
      showToast('Document Deleted', target ? `Removed "${target.title}"` : 'Publication removed');
    } catch (err) {
      showToast('Delete Failed', extractErrorMessage(err));
    }
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
            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-[#5d5b54] text-sm gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading content...</span>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <p className="text-sm text-[#ba1a1a]">Couldn't load content: {loadError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 rounded-lg bg-[#5645d4] hover:bg-[#4534b3] text-white text-xs font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : activeNav === 'content-publishing' ? (
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
        onSaveEdits={handleSaveEdits}
        onDeleteItem={handleDeleteItem}
        onSubmitForApproval={handleSubmitForApproval}
        onApprove={handleApprove}
        onReject={handleReject}
        onPublish={handlePublish}
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