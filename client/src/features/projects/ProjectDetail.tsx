import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pencil, RefreshCw, Archive, X } from 'lucide-react';
import { projectApi, userApi, getStoredUser } from '../../api/axiosClient';
import type { ApiProjectDashboard, ApiUserSummary } from '../../api/types';
import { Toast } from '../../components/layout/Toast';
import { ProjectFormModal } from './ProjectFormModal';
import { FileAttachments } from '../files/FileAttachments';
import {
  PRIORITY_DOT,
  STATUS_STYLE,
  canManageProject,
  extractErrorMessage,
  formatDate,
  personName,
} from './projectUi';

interface DetailResult {
  key: string;
  data?: ApiProjectDashboard;
  error?: string;
}

interface ProjectDetailProps {
  projectId: string;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId }) => {
  const user = getStoredUser();

  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<DetailResult | null>(null);
  const [users, setUsers] = useState<ApiUserSummary[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const requestKey = `${projectId}:${reloadKey}`;

  useEffect(() => {
    let cancelled = false;
    projectApi
      .dashboard(projectId)
      .then((res) => {
        if (!cancelled) setResult({ key: requestKey, data: res.data });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key: requestKey, error: extractErrorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, requestKey]);

  // Best-effort: the members endpoint only returns user ids, so look names up.
  // /users/search is Admin/Manager only — Employees just see "Unknown user".
  useEffect(() => {
    userApi
      .search({ limit: 100 })
      .then((res) => setUsers(res.data))
      .catch(() => setUsers([]));
  }, []);

  const reload = () => setReloadKey((k) => k + 1);

  // Only block on the very first load; refetches after an edit keep the
  // current data on screen instead of flashing a spinner.
  if (result === null) {
    return (
      <div className="flex items-center justify-center py-24 text-[#5d5b54] text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Loading project...</span>
      </div>
    );
  }

  if (result?.error || !result?.data) {
    return (
      <div className="flex flex-col items-center py-24 gap-3 text-center">
        <p className="text-sm text-[#ba1a1a]">Couldn't load project: {result?.error}</p>
        <div className="flex gap-2">
          <button
            onClick={reload}
            className="px-3 py-1.5 rounded-lg bg-[#5645d4] hover:bg-[#4534b3] text-white text-xs font-medium"
          >
            Retry
          </button>
          <Link
            to="/projects"
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#5d5b54] hover:bg-[#f0eeec]"
          >
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  const { project, progress, task_counts, overdue_tasks } = result.data;
  const members = project.members ?? [];
  const userById = new Map(users.map((u) => [u.user_id, u] as const));
  const memberIds = new Set(members.map((m) => m.user_id));
  const addableUsers = users.filter((u) => !memberIds.has(u.user_id));

  const isArchived = project.status === 'Archived';
  const canManage = canManageProject(project, user) && !isArchived;

  const handleArchive = async () => {
    if (!window.confirm(`Archive "${project.name}"? Archived projects can't be edited.`)) return;
    setActionError(null);
    try {
      await projectApi.archive(project.project_id);
      setToast('Project archived');
      reload();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    }
  };

  const handleAddMember = async () => {
    if (!newMemberId) return;
    setActionError(null);
    try {
      await projectApi.addMember(project.project_id, newMemberId);
      setNewMemberId('');
      reload();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setActionError(null);
    try {
      await projectApi.removeMember(project.project_id, userId);
      reload();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    }
  };

  const stats = [
    { label: 'Total', value: task_counts.total },
    { label: 'To do', value: task_counts.todo },
    { label: 'In progress', value: task_counts.in_progress },
    { label: 'Completed', value: task_counts.completed },
    { label: 'Overdue', value: overdue_tasks.length },
  ];

  return (
    <div className="space-y-6">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-xs text-[#5d5b54] hover:text-[#37352f]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Projects
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[26px] font-semibold text-[#37352f] tracking-tight">{project.name}</h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-[#f0eeec] text-[#5d5b54]">
              {project.key_code}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span
              className={`px-2 py-0.5 rounded-full font-semibold ${
                STATUS_STYLE[project.status] ?? STATUS_STYLE.Planned
              }`}
            >
              {project.status}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#5d5b54]">
              <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[project.priority] ?? 'bg-[#a4a097]'}`} />
              {project.priority} priority
            </span>
          </div>
        </div>

        {canManage && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="px-3 py-2 rounded-lg border border-[#e8e7e4] text-xs font-medium text-[#37352f] hover:bg-[#f0eeec] flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={handleArchive}
              className="px-3 py-2 rounded-lg border border-[#e8e7e4] text-xs font-medium text-[#5d5b54] hover:bg-[#f0eeec] flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive
            </button>
          </div>
        )}
      </div>

      {actionError && <p className="text-xs text-[#ba1a1a]">{actionError}</p>}

      {/* Overview */}
      <section className="bg-white rounded-xl border border-[#e8e7e4] p-5 space-y-4">
        <p className="text-sm text-[#5d5b54] leading-relaxed">
          {project.description || 'No description.'}
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <dt className="text-[#9b9a97] uppercase font-semibold tracking-wider">Owner</dt>
            <dd className="mt-1 text-[13px] text-[#37352f]">{personName(project.owner)}</dd>
          </div>
          <div>
            <dt className="text-[#9b9a97] uppercase font-semibold tracking-wider">Start</dt>
            <dd className="mt-1 text-[13px] text-[#37352f]">{formatDate(project.start_date)}</dd>
          </div>
          <div>
            <dt className="text-[#9b9a97] uppercase font-semibold tracking-wider">Due</dt>
            <dd className="mt-1 text-[13px] text-[#37352f]">{formatDate(project.due_date)}</dd>
          </div>
        </dl>
      </section>

      {/* Progress */}
      <section className="bg-white rounded-xl border border-[#e8e7e4] p-5 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#37352f] uppercase tracking-wider">Progress</span>
          <span className="text-[#5d5b54]">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-[#f0eeec] overflow-hidden">
          <div className="h-full bg-[#5645d4] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-[#fafaf9] rounded-lg border border-[#e8e7e4] px-3 py-2">
              <div className="text-lg font-semibold text-[#37352f]">{s.value}</div>
              <div className="text-[11px] text-[#9b9a97]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Members */}
      <section className="bg-white rounded-xl border border-[#e8e7e4] p-5 space-y-3">
        <span className="text-xs font-semibold text-[#37352f] uppercase tracking-wider">
          Members ({members.length})
        </span>

        <ul className="divide-y divide-[#f1efed]">
          {members.map((m) => {
            const u = userById.get(m.user_id);
            return (
              <li key={m.user_id} className="py-2 flex items-center justify-between text-[13px]">
                <div>
                  <span className="text-[#37352f]">{u ? personName(u) : 'Unknown user'}</span>
                  {u && <span className="ml-2 text-xs text-[#9b9a97]">{u.email}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#5d5b54] capitalize">{m.role}</span>
                  {canManage && m.user_id !== project.owner_id && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="text-[#9b9a97] hover:text-[#ba1a1a]"
                      aria-label="Remove member"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {canManage && addableUsers.length > 0 && (
          <div className="flex gap-2 pt-1">
            <select
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              className="flex-1 max-w-xs text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg bg-white outline-none focus:border-[#5645d4]"
            >
              <option value="">Add a member…</option>
              {addableUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {personName(u)} ({u.email})
                </option>
              ))}
            </select>
            <button
              onClick={handleAddMember}
              disabled={!newMemberId}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-[#5645d4] hover:bg-[#4534b3] text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-[#e8e7e4] p-5">
        <FileAttachments scope="project" id={project.project_id} />
      </section>

      {editOpen && (
        <ProjectFormModal
          project={project}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            setToast('Project updated');
            reload();
          }}
        />
      )}

      <Toast isOpen={toast !== null} title={toast ?? ''} subtitle="" onClose={() => setToast(null)} />
    </div>
  );
};
