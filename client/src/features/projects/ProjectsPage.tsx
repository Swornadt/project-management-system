import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { projectApi, getStoredUser } from '../../api/axiosClient';
import type { ApiProjectResponse } from '../../api/types';
import { Toast } from '../../components/layout/Toast';
import { ProjectDetail } from './ProjectDetail';
import { ProjectFormModal } from './ProjectFormModal';
import {
  PRIORITIES,
  PRIORITY_DOT,
  STATUSES,
  STATUS_STYLE,
  canCreateProject,
  extractErrorMessage,
  formatDate,
  personName,
} from './projectUi';

const PER_PAGE = 10;

interface ListResult {
  key: string; // the query this result belongs to
  projects: ApiProjectResponse[];
  total: number;
  error?: string;
}

const selectClass =
  'text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg bg-white outline-none focus:border-[#5645d4]';

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // debounced copy of `search`
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<ListResult | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Wait for typing to pause before hitting the API.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Archived projects are hidden by the API unless asked for — only ask when
  // the user filters by the Archived status.
  const requestKey = JSON.stringify([query, status, priority, page, reloadKey]);
  const loading = result?.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    projectApi
      .list({
        page,
        per_page: PER_PAGE,
        q: query || undefined,
        status: status || undefined,
        priority: priority || undefined,
        include_archived: status === 'Archived',
      })
      .then((res) => {
        if (!cancelled) {
          setResult({ key: requestKey, projects: res.data, total: res.meta?.total ?? res.data.length });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({ key: requestKey, projects: [], total: 0, error: extractErrorMessage(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, page, query, status, priority]);

  const projects = result?.projects ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const resetPageThen = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[26px] font-semibold text-[#37352f] tracking-tight">Projects</h1>
        {canCreateProject(user) && (
          <button
            onClick={() => setCreateOpen(true)}
            className="px-3.5 py-2 bg-[#5645d4] hover:bg-[#4534b3] text-white text-xs font-medium rounded-lg flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New project
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9b9a97]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, key or description"
            className="w-full text-xs pl-8 pr-2.5 py-2 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4]"
          />
        </div>
        <select
          value={status}
          onChange={(e) => resetPageThen(() => setStatus(e.target.value))}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => resetPageThen(() => setPriority(e.target.value))}
          className={selectClass}
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e8e7e4] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#5d5b54] text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading projects...</span>
          </div>
        ) : result?.error ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <p className="text-sm text-[#ba1a1a]">Couldn't load projects: {result.error}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-3 py-1.5 rounded-lg bg-[#5645d4] hover:bg-[#4534b3] text-white text-xs font-medium"
            >
              Retry
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#5d5b54]">
            {query || status || priority ? 'No projects match your filters.' : 'No projects yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="bg-[#fafaf9] border-b border-[#e8e7e4] text-[11px] uppercase tracking-wider text-[#9b9a97]">
                  <th className="px-4 py-2.5 font-semibold">Project</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Priority</th>
                  <th className="px-4 py-2.5 font-semibold">Owner</th>
                  <th className="px-4 py-2.5 font-semibold">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1efed]">
                {projects.map((p) => (
                  <tr
                    key={p.project_id}
                    onClick={() => navigate(`/projects/${p.project_id}`)}
                    className="hover:bg-[#f0f4f8] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#37352f]">{p.name}</div>
                      <div className="text-[11px] text-[#9b9a97] font-mono">{p.key_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          STATUS_STYLE[p.status] ?? STATUS_STYLE.Planned
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[#5d5b54]">
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[p.priority] ?? 'bg-[#a4a097]'}`} />
                        {p.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5d5b54]">{personName(p.owner)}</td>
                    <td className="px-4 py-3 text-[#5d5b54]">{formatDate(p.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !result?.error && total > 0 && (
        <div className="flex items-center justify-between text-xs text-[#5d5b54]">
          <span>
            {total} project{total === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="px-2.5 py-1.5 rounded-lg border border-[#e8e7e4] disabled:opacity-40 hover:bg-[#f0eeec]"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-[#e8e7e4] disabled:opacity-40 hover:bg-[#f0eeec]"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {createOpen && (
        <ProjectFormModal
          onClose={() => setCreateOpen(false)}
          onSaved={(created) => {
            setCreateOpen(false);
            setToast(`Created ${created.name}`);
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      <Toast isOpen={toast !== null} title={toast ?? ''} subtitle="" onClose={() => setToast(null)} />
    </div>
  );
};

/** Routes /projects → list and /projects/:projectId → details. */
const ProjectsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  return projectId ? <ProjectDetail projectId={projectId} /> : <ProjectList />;
};

export default ProjectsPage;
