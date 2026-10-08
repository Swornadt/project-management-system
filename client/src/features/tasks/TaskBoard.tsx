import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, Clock } from 'lucide-react';
import { projectApi, taskApi } from '../../api/axiosClient';
import type { ApiProjectResponse } from '../../api/types';
import type { ApiTaskResponse, TaskStatus } from '../../api/taskTypes';
import { TaskDrawer } from './TaskDrawer';
import { NewTaskModal } from './NewTaskModal';

const COLUMNS: { id: TaskStatus; label: string; accent: string }[] = [
  { id: 'backlog', label: 'Backlog', accent: 'border-[#9b9a97]' },
  { id: 'todo', label: 'Todo', accent: 'border-[#787671]' },
  { id: 'in_progress', label: 'In Progress', accent: 'border-[#0075de]' },
  { id: 'in_review', label: 'In Review', accent: 'border-[#dd5b00]' },
  { id: 'blocked', label: 'Blocked', accent: 'border-[#e03131]' },
  { id: 'done', label: 'Done', accent: 'border-[#1aae39]' },
  { id: 'cancelled', label: 'Cancelled', accent: 'border-[#bbb8b1]' },
];

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-[#e03131]',
  high: 'bg-[#dd5b00]',
  medium: 'bg-[#f5d75e]',
  low: 'bg-[#a4a097]',
};

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

const LAST_PROJECT_KEY = 'taskBoardProject';

interface TaskState {
  key: string; // "<projectId>:<reloadKey>" the tasks were fetched for
  tasks: ApiTaskResponse[];
  error?: string;
}

export const TaskBoard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProjectId = searchParams.get('project');

  const [projects, setProjects] = useState<ApiProjectResponse[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectsReload, setProjectsReload] = useState(0);

  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [tasksReload, setTasksReload] = useState(0);

  const [selectedTask, setSelectedTask] = useState<ApiTaskResponse | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);

  // Projects the user can see (the API already limits this by role/membership;
  // archived ones are excluded by default).
  useEffect(() => {
    let cancelled = false;
    projectApi
      .list({ per_page: 100 })
      .then((res) => {
        if (!cancelled) {
          setProjects(res.data);
          setProjectsError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setProjectsError(extractErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [projectsReload]);

  // Which project the board shows: ?project= in the URL, else the last one
  // used, else the first in the list.
  const projectId = projects
    ? (
        projects.find((p) => p.project_id === urlProjectId) ??
        projects.find((p) => p.project_id === localStorage.getItem(LAST_PROJECT_KEY)) ??
        projects[0]
      )?.project_id
    : undefined;

  const taskKey = `${projectId}:${tasksReload}`;
  const tasksLoading = Boolean(projectId) && taskState?.key !== taskKey;
  const tasks = taskState?.tasks ?? [];
  const tasksError = taskState?.key === taskKey ? taskState.error : undefined;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    const key = `${projectId}:${tasksReload}`;
    taskApi
      .listForProject(projectId)
      .then((res) => {
        if (!cancelled) setTaskState({ key, tasks: res.data });
      })
      .catch((err) => {
        if (!cancelled) setTaskState({ key, tasks: [], error: extractErrorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, tasksReload]);

  const updateTasks = (fn: (prev: ApiTaskResponse[]) => ApiTaskResponse[]) =>
    setTaskState((s) => (s ? { ...s, tasks: fn(s.tasks) } : s));

  const handleProjectChange = (id: string) => {
    localStorage.setItem(LAST_PROJECT_KEY, id);
    setSelectedTask(null);
    setSearchParams({ project: id });
  };

  const handleTaskUpdated = (updated: ApiTaskResponse) => {
    updateTasks((prev) => prev.map((t) => (t.task_id === updated.task_id ? updated : t)));
    setSelectedTask(updated);
  };

  const handleTaskDeleted = (id: string) => {
    updateTasks((prev) => prev.filter((t) => t.task_id !== id));
    setSelectedTask(null);
  };

  if (projectsError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <p className="text-sm text-[#ba1a1a]">Couldn't load projects: {projectsError}</p>
        <button
          onClick={() => setProjectsReload((k) => k + 1)}
          className="px-3 py-1.5 rounded-lg bg-[#5645d4] hover:bg-[#4534b3] text-white text-xs font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (projects === null) {
    return (
      <div className="flex items-center justify-center py-24 text-[#5d5b54] text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="py-24 text-center space-y-2">
        <p className="text-sm text-[#5d5b54]">You don't have any projects yet.</p>
        <Link to="/projects" className="text-xs text-[#5645d4] hover:underline">
          Go to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold text-[#37352f] tracking-tight">Task Board</h1>
          <div className="flex items-center gap-2 mt-1">
            <select
              value={projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              aria-label="Project"
              className="text-xs px-2.5 py-1.5 border border-[#e8e7e4] rounded-lg bg-white outline-none focus:border-[#5645d4] max-w-[260px]"
            >
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.key_code} · {p.name}
                </option>
              ))}
            </select>
            {!tasksLoading && !tasksError && (
              <span className="text-[13px] text-[#5d5b54]">
                {tasks.length} task{tasks.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setNewModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#5645d4] hover:bg-[#4534b3] text-white text-[13px] font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {tasksLoading ? (
        <div className="flex items-center justify-center py-24 text-[#5d5b54] text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading tasks...</span>
        </div>
      ) : tasksError ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <p className="text-sm text-[#ba1a1a]">Couldn't load tasks: {tasksError}</p>
          <button
            onClick={() => setTasksReload((k) => k + 1)}
            className="px-3 py-1.5 rounded-lg bg-[#5645d4] hover:bg-[#4534b3] text-white text-xs font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
      <div className="grid grid-flow-col auto-cols-[260px] gap-4 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className="bg-[#fafaf9] rounded-xl p-3 border border-[#e8e7e4] flex flex-col min-h-[420px]"
            >
              <div className={`flex items-center justify-between pb-2 mb-3 border-b-2 ${col.accent}`}>
                <span className="text-xs font-semibold text-[#37352f] uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f0eeec] text-[#5d5b54]">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colTasks.map((task) => (
                  <div
                    key={task.task_id}
                    onClick={() => setSelectedTask(task)}
                    className="bg-white p-3 rounded-lg border border-[#e8e7e4] hover:border-[#5645d4]/50 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[task.priority] || 'bg-[#a4a097]'}`}
                      />
                      <div className="text-xs font-semibold text-[#37352f] group-hover:text-[#5645d4] line-clamp-2">
                        {task.title}
                      </div>
                    </div>
                    {(task.due_date || task.is_overdue) && (
                      <div
                        className={`flex items-center gap-1 mt-2 text-[11px] ${task.is_overdue ? 'text-[#e03131] font-medium' : 'text-[#9b9a97]'}`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : ''}</span>
                        {task.is_overdue && <span>· Overdue</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      )}

      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />
      <NewTaskModal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        projectId={projectId}
        onCreated={(created) => {
          updateTasks((prev) => [created, ...prev]);
          setNewModalOpen(false);
        }}
      />
    </div>
  );
};
