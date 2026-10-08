import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { TaskBoard } from '../tasks/TaskBoard';
import ProjectsPage from '../projects/ProjectsPage';
import { ExecutiveOverview } from '../overview/ExecutiveOverview';
import { contentApi, projectApi, userApi, getStoredUser } from '../../api/axiosClient';
import type { ApiProjectResponse } from '../../api/types';
import { NAV_PATHS, resolveNavKey } from '../../routes/navPaths';
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

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

export const ContentDashboard = () => {
  // Navigation — activeNav now comes from the URL (see App.tsx's
  // "/:navKey" route) instead of local state, so each section has a real,
  // bookmarkable/shareable address and the browser back/forward buttons
  // work. setActiveNav is kept as a same-signature wrapper around
  // navigate() specifically so every existing call site below (Sidebar,
  // OtherViews, QuickSearchModal) needs zero changes.
  const navigate = useNavigate();
  const { navKey, projectId } = useParams<{ navKey: string; projectId: string }>();
  // /projects/:projectId has no :navKey segment, so it maps to the projects nav.
  const activeNav = projectId ? 'projects-and-roadmaps' : resolveNavKey(navKey);
  const setActiveNav = (nav: ActiveNavKey) => navigate(NAV_PATHS[nav]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Content state
  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  const [projects, setProjects] = useState<ApiProjectResponse[]>([]);
  const [authorNames, setAuthorNames] = useState<Map<string, string>>(new Map());
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

    // /users/search is Admin/Manager only; for anyone else it 403s and we just
    // fall back to the placeholder author name.
    const loadUsers = userApi
      .search({ limit: 100 })
      .then((res) => res.data)
      .catch(() => []);

    Promise.all([
      contentApi.list({ limit: 200 }),
      projectApi.list({ per_page: 100 }),
      loadUsers,
    ])
      .then(([contentResponse, projectResponse, users]) => {
        if (cancelled) return;

        const loadedProjects = projectResponse.data ?? [];
        const projectNameMap = new Map(
          loadedProjects.map((project) => [project.project_id, project.name] as const)
        );

        const names = new Map<string, string>();
        users.forEach((u) => names.set(u.user_id, `${u.first_name} ${u.last_name}`.trim()));
        const me = getStoredUser();
        if (me) names.set(me.user_id, `${me.first_name} ${me.last_name}`.trim());

        setProjects(loadedProjects);
        setAuthorNames(names);
        setAllItems(
          contentResponse.data.map((apiItem) =>
            apiToContentItem(
              apiItem,
              projectNameMap.get(apiItem.project_id),
              names.get(apiItem.author_id)
            )
          )
        );
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

  // Maps an API response using the project/author names loaded above, so
  // items keep their real names after create/update instead of showing ids.
  const toItem = (api: Parameters<typeof apiToContentItem>[0]) =>
    apiToContentItem(
      api,
      projects.find((p) => p.project_id === api.project_id)?.name,
      authorNames.get(api.author_id)
    );

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
    if (!payload.projectId) {
      throw new Error('Select a project first — create one under Projects if the list is empty.');
    }
    // The server sets the author from your login.
    const res = await contentApi.create({
      project_id: payload.projectId,
      title: payload.title,
      slug: payload.slug,
      body: payload.body,
    });
    const created = toItem(res.data);
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
    const updated = toItem(res.data);
    // summary has no backend field yet — keep it client-side so it isn't
    // silently dropped from the drawer until Content grows a real column.
    const merged = { ...updated, summary: edits.summary };
    setAllItems((prev) => prev.map((it) => (it.id === id ? merged : it)));
    setSelectedItem(merged);
  };

  const handleSubmitForApproval = async (id: string) => {
    const res = await contentApi.submitForApproval(id);
    const updated = toItem(res.data);
    setAllItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    setSelectedItem(updated);
  };

  const handleApprove = async (id: string) => {
    // The server uses your login as the reviewer (and blocks approving your own content).
    const res = await contentApi.decideApproval(id, { decision: 'approved' });
    const updated = toItem(res.data);
    setAllItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    setSelectedItem(updated);
  };

  const handleReject = async (id: string, reason: string) => {
    const res = await contentApi.decideApproval(id, { decision: 'rejected', reason });
    // rejectionReason isn't in ApiContentResponse (GET doesn't return
    // approval history — see the note in contentMapper.ts), so it's applied
    // here from what we already know locally rather than dropped. It'll
    // survive until the next refetch, then disappear — a known gap.
    const updated = { ...toItem(res.data), rejectionReason: reason };
    setAllItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    setSelectedItem(updated);
  };

  const handlePublish = async (id: string) => {
    const res = await contentApi.publish(id);
    const updated = toItem(res.data);
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
            {activeNav === 'projects-and-roadmaps' ? (
              <ProjectsPage />
            ) : activeNav === 'executive-overview' ? (
              <ExecutiveOverview />
            ) : isLoading ? (
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
            ) : activeNav === 'task-kanban-board' ? (
              <TaskBoard />
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
                  projects={projects}
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