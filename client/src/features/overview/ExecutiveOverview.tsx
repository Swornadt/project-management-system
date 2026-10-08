import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { contentApi, getStoredUser, projectApi, taskApi } from '../../api/axiosClient';
import { approvalApi, type ApiApproval } from '../../api/approvalApi';
import type { ApiContentResponse, ApiProjectResponse } from '../../api/types';
import type { ApiTaskResponse } from '../../api/taskTypes';
import { STATUS_STYLE, formatDate } from '../projects/projectUi';

// There's no "all my tasks" endpoint, so tasks are fetched per project.
// Capped so a user in many projects doesn't fire dozens of requests.
const MAX_PROJECTS_FOR_TASKS = 25;
const TERMINAL_TASK = new Set(['done', 'cancelled']);

interface OverviewData {
  projects: ApiProjectResponse[] | null; // null = failed to load
  tasks: ApiTaskResponse[] | null;
  tasksPartial: boolean; // some projects' tasks missing (failed or over the cap)
  contents: ApiContentResponse[] | null;
  // undefined = not applicable (only Admin/Manager can list pending approvals)
  approvals: { items: ApiApproval[]; total: number } | null | undefined;
}

// Each section loads independently so one failing endpoint doesn't blank the page.
async function loadOverview(isReviewer: boolean): Promise<OverviewData> {
  const projectsAndTasks = (async () => {
    const res = await projectApi.list({ per_page: 100 });
    const projects = res.data;
    const settled = await Promise.allSettled(
      projects.slice(0, MAX_PROJECTS_FOR_TASKS).map((p) => taskApi.listForProject(p.project_id))
    );
    const tasks = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value.data : []));
    const partial =
      projects.length > MAX_PROJECTS_FOR_TASKS || settled.some((s) => s.status === 'rejected');
    return { projects, tasks, partial };
  })();

  const contents = contentApi.list({ limit: 200 }).then((res) => res.data);

  const approvals: Promise<{ items: ApiApproval[]; total: number } | undefined> = isReviewer
    ? approvalApi
        .listPending({ limit: 20 })
        .then((res) => ({ items: res.data, total: res.meta?.total ?? res.data.length }))
    : Promise.resolve(undefined);

  const [pt, c, a] = await Promise.allSettled([projectsAndTasks, contents, approvals]);

  return {
    projects: pt.status === 'fulfilled' ? pt.value.projects : null,
    tasks: pt.status === 'fulfilled' ? pt.value.tasks : null,
    tasksPartial: pt.status === 'fulfilled' && pt.value.partial,
    contents: c.status === 'fulfilled' ? c.value : null,
    approvals: a.status === 'fulfilled' ? a.value : null,
  };
}

const CONTENT_STATUS: Record<string, { label: string; style: string }> = {
  draft: { label: 'Draft', style: 'bg-[#f0eeec] text-[#5d5b54]' },
  pending_approval: { label: 'In review', style: 'bg-[#fef7d6] text-[#dd5b00]' },
  approved: { label: 'Approved', style: 'bg-[#dcecfa] text-[#0075de]' },
  rejected: { label: 'Rejected', style: 'bg-[#fde0e0] text-[#ba1a1a]' },
  scheduled: { label: 'Scheduled', style: 'bg-[#e6e0f5] text-[#5645d4]' },
  published: { label: 'Published', style: 'bg-[#d9f3e1] text-[#1aae39]' },
};

const TASK_PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-[#e03131]',
  high: 'bg-[#dd5b00]',
  medium: 'bg-[#f5d75e]',
  low: 'bg-[#a4a097]',
};

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const StatCard: React.FC<{ label: string; value: string | number; note?: string; noteClass?: string }> = ({
  label,
  value,
  note,
  noteClass = 'text-[#5d5b54]',
}) => (
  <div className="bg-[#fafaf9] p-4 rounded-xl border border-[#e8e7e4]">
    <span className="text-xs text-[#9b9a97] uppercase font-semibold">{label}</span>
    <div className="text-2xl font-semibold text-[#37352f] mt-1">{value}</div>
    {note && <span className={`text-xs ${noteClass}`}>{note}</span>}
  </div>
);

const Panel: React.FC<{ title: string; to?: string; children: React.ReactNode }> = ({ title, to, children }) => (
  <section className="bg-white rounded-xl border border-[#e8e7e4] p-5 space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-xs font-semibold text-[#37352f] uppercase tracking-wider">{title}</h2>
      {to && (
        <Link to={to} className="text-[11px] text-[#5645d4] hover:underline">
          View all
        </Link>
      )}
    </div>
    {children}
  </section>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs text-[#9b9a97] py-2">{children}</p>
);

const Failed: React.FC<{ what: string }> = ({ what }) => (
  <p className="text-xs text-[#ba1a1a] py-2">Couldn't load {what}.</p>
);

export const ExecutiveOverview: React.FC = () => {
  const user = getStoredUser();
  const role = user?.role_name?.toLowerCase();
  const isReviewer = role === 'admin' || role === 'manager';

  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadOverview(isReviewer).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [isReviewer]);

  if (data === null) {
    return (
      <div className="flex items-center justify-center py-24 text-[#5d5b54] text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Loading overview...</span>
      </div>
    );
  }

  const { projects, tasks, contents, approvals } = data;
  const me = user?.user_id;
  const today = localToday();

  const isOverdue = (t: ApiTaskResponse) =>
    !TERMINAL_TASK.has(t.status) && !!t.due_date && t.due_date.slice(0, 10) < today;

  const projectName = new Map((projects ?? []).map((p) => [p.project_id, p.name] as const));
  const projectKey = new Map((projects ?? []).map((p) => [p.project_id, p.key_code] as const));

  // ---- Tasks ----
  const myOpenTasks = (tasks ?? [])
    .filter((t) => t.assignee_id === me && !TERMINAL_TASK.has(t.status))
    .sort((a, b) => {
      const ao = isOverdue(a) ? 0 : 1;
      const bo = isOverdue(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
    });
  const myOverdue = myOpenTasks.filter(isOverdue).length;

  // ---- Projects ----
  const STATUS_ORDER = ['Active', 'Planned', 'On Hold', 'Completed'];
  const sortedProjects = [...(projects ?? [])].sort((a, b) => {
    const s = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (s !== 0) return s;
    return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
  });
  const activeCount = (projects ?? []).filter((p) => p.status === 'Active').length;

  const progressFor = (projectId: string): number | null => {
    if (!tasks) return null;
    const counted = tasks.filter((t) => t.project_id === projectId && t.status !== 'cancelled');
    if (counted.length === 0) return null;
    return Math.round((counted.filter((t) => t.status === 'done').length / counted.length) * 100);
  };

  // ---- Content ----
  const statusCounts = new Map<string, number>();
  (contents ?? []).forEach((c) => statusCounts.set(c.status, (statusCounts.get(c.status) ?? 0) + 1));
  const inReview = statusCounts.get('pending_approval') ?? 0;
  const recentContent = [...(contents ?? [])]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 4);

  // ---- Approvals ----
  const contentById = new Map((contents ?? []).map((c) => [c.content_id, c] as const));
  const mySubmissions = (contents ?? []).filter((c) => c.author_id === me && c.status === 'pending_approval');

  const approvalValue = isReviewer
    ? approvals ? approvals.total : '—'
    : contents ? mySubmissions.length : '—';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-[26px] font-semibold text-[#37352f] tracking-tight">Executive Overview</h1>
        <p className="text-[14px] text-[#5d5b54] mt-0.5">
          {user ? `Welcome back, ${user.first_name}. ` : ''}Here's where your projects, tasks, content and
          approvals stand.
        </p>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active projects"
          value={projects ? activeCount : '—'}
          note={projects ? `${projects.length} total` : undefined}
        />
        <StatCard
          label="My open tasks"
          value={tasks ? myOpenTasks.length : '—'}
          note={tasks ? (myOverdue > 0 ? `${myOverdue} overdue` : 'None overdue') : undefined}
          noteClass={myOverdue > 0 ? 'text-[#ba1a1a] font-medium' : 'text-[#5d5b54]'}
        />
        <StatCard
          label="Content in review"
          value={contents ? inReview : '—'}
          note={
            contents
              ? `${statusCounts.get('draft') ?? 0} drafts · ${statusCounts.get('published') ?? 0} published`
              : undefined
          }
        />
        <StatCard
          label={isReviewer ? 'Awaiting your review' : 'My submissions in review'}
          value={approvalValue}
          note={isReviewer ? 'Pending approvals' : 'Waiting on a reviewer'}
        />
      </div>

      {data.tasksPartial && (
        <p className="text-[11px] text-[#9b9a97]">
          Task figures cover only the projects that loaded (up to {MAX_PROJECTS_FOR_TASKS}).
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Projects */}
        <Panel title="Projects" to="/projects">
          {projects === null ? (
            <Failed what="projects" />
          ) : sortedProjects.length === 0 ? (
            <Empty>No projects yet.</Empty>
          ) : (
            <ul className="divide-y divide-[#f1efed]">
              {sortedProjects.slice(0, 5).map((p) => {
                const progress = progressFor(p.project_id);
                return (
                  <li key={p.project_id}>
                    <Link
                      to={`/projects/${p.project_id}`}
                      className="flex items-center gap-3 py-2.5 hover:bg-[#f0f4f8] -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-[#37352f] truncate">{p.name}</div>
                        <div className="text-[11px] text-[#9b9a97]">
                          {p.key_code} · Due {formatDate(p.due_date)}
                        </div>
                      </div>
                      {progress !== null && (
                        <div className="w-20 shrink-0">
                          <div className="h-1.5 rounded-full bg-[#f0eeec] overflow-hidden">
                            <div className="h-full bg-[#5645d4]" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="text-[10px] text-[#9b9a97] text-right mt-0.5">{progress}%</div>
                        </div>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                          STATUS_STYLE[p.status] ?? STATUS_STYLE.Planned
                        }`}
                      >
                        {p.status}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* My tasks */}
        <Panel title="My tasks" to="/tasks">
          {tasks === null ? (
            <Failed what="tasks" />
          ) : myOpenTasks.length === 0 ? (
            <Empty>No open tasks assigned to you.</Empty>
          ) : (
            <ul className="divide-y divide-[#f1efed]">
              {myOpenTasks.slice(0, 6).map((t) => {
                const overdue = isOverdue(t);
                return (
                  <li key={t.task_id}>
                    <Link
                      to={`/tasks?project=${t.project_id}`}
                      className="flex items-center gap-2.5 py-2.5 hover:bg-[#f0f4f8] -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${TASK_PRIORITY_DOT[t.priority] ?? 'bg-[#a4a097]'}`}
                        title={`${t.priority} priority`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-[#37352f] truncate">{t.title}</div>
                        <div className="text-[11px] text-[#9b9a97]">
                          {projectKey.get(t.project_id) ?? 'Project'} · {t.status.replace('_', ' ')}
                        </div>
                      </div>
                      <span className={`text-[11px] shrink-0 ${overdue ? 'text-[#ba1a1a] font-medium' : 'text-[#5d5b54]'}`}>
                        {overdue ? 'Overdue · ' : ''}
                        {formatDate(t.due_date)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Approvals */}
        <Panel title={isReviewer ? 'Awaiting your review' : 'My submissions in review'} to="/content">
          {isReviewer ? (
            approvals === null ? (
              <Failed what="approvals" />
            ) : !approvals || approvals.items.length === 0 ? (
              <Empty>Nothing waiting for review.</Empty>
            ) : (
              <ul className="divide-y divide-[#f1efed]">
                {approvals.items.slice(0, 5).map((a) => {
                  const c = contentById.get(a.content_id);
                  return (
                    <li key={a.approval_id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-[#37352f] truncate">{c?.title ?? 'Untitled content'}</div>
                        <div className="text-[11px] text-[#9b9a97]">
                          {c ? projectName.get(c.project_id) ?? 'Project' : 'Project'} · submitted{' '}
                          {timeAgo(a.submitted_at)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : contents === null ? (
            <Failed what="content" />
          ) : mySubmissions.length === 0 ? (
            <Empty>You have nothing waiting on a reviewer.</Empty>
          ) : (
            <ul className="divide-y divide-[#f1efed]">
              {mySubmissions.slice(0, 5).map((c) => (
                <li key={c.content_id} className="py-2.5">
                  <div className="text-[13px] text-[#37352f] truncate">{c.title}</div>
                  <div className="text-[11px] text-[#9b9a97]">
                    {projectName.get(c.project_id) ?? 'Project'} · updated {timeAgo(c.updated_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Content */}
        <Panel title="Content" to="/content">
          {contents === null ? (
            <Failed what="content" />
          ) : contents.length === 0 ? (
            <Empty>No content yet.</Empty>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(CONTENT_STATUS)
                  .filter(([key]) => statusCounts.has(key))
                  .map(([key, s]) => (
                    <span key={key} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.style}`}>
                      {s.label} {statusCounts.get(key)}
                    </span>
                  ))}
              </div>
              <ul className="divide-y divide-[#f1efed]">
                {recentContent.map((c) => (
                  <li key={c.content_id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-[#37352f] truncate">{c.title}</div>
                      <div className="text-[11px] text-[#9b9a97]">
                        {projectName.get(c.project_id) ?? 'Project'} · updated {timeAgo(c.updated_at)}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                        CONTENT_STATUS[c.status]?.style ?? CONTENT_STATUS.draft.style
                      }`}
                    >
                      {CONTENT_STATUS[c.status]?.label ?? c.status}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
};
