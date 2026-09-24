import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw, Clock } from 'lucide-react';
import { taskApi } from '../../api/axiosClient';
import type { ApiTaskResponse, TaskStatus } from '../../api/taskTypes';
import { TaskDrawer } from './TaskDrawer';
import { NewTaskModal } from './NewTaskModal';

// STOPGAP: same pattern as Content — no Projects UI yet, so the board
// operates within one project pulled from env. Swap for real project
// context once a Projects picker exists.
const DEV_PROJECT_ID = import.meta.env.VITE_DEV_PROJECT_ID as string | undefined;

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

export const TaskBoard: React.FC = () => {
  const [tasks, setTasks] = useState<ApiTaskResponse[]>([]);
  const [isLoading, setIsLoading] = useState(!!DEV_PROJECT_ID);
  const [loadError, setLoadError] = useState<string | null>(
    DEV_PROJECT_ID ? null : 'No project configured — set VITE_DEV_PROJECT_ID in client/.env'
  );
  const [selectedTask, setSelectedTask] = useState<ApiTaskResponse | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);

  const fetchTasks = () => {
    if (!DEV_PROJECT_ID) return;
    taskApi
      .listForProject(DEV_PROJECT_ID)
      .then((res) => setTasks(res.data))
      .catch((err) => setLoadError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    fetchTasks();
  };

  const handleTaskUpdated = (updated: ApiTaskResponse) => {
    setTasks((prev) => prev.map((t) => (t.task_id === updated.task_id ? updated : t)));
    setSelectedTask(updated);
  };

  const handleTaskDeleted = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.task_id !== id));
    setSelectedTask(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#5d5b54] text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Loading tasks...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <p className="text-sm text-[#ba1a1a]">Couldn't load tasks: {loadError}</p>
        <button
          onClick={handleRetry}
          className="px-3 py-1.5 rounded-lg bg-[#5645d4] hover:bg-[#4534b3] text-white text-xs font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold text-[#37352f] tracking-tight">Task Board</h1>
          <p className="text-[14px] text-[#5d5b54] mt-0.5">
            {tasks.length} task{tasks.length === 1 ? '' : 's'} in this project
          </p>
        </div>
        <button
          onClick={() => setNewModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#5645d4] hover:bg-[#4534b3] text-white text-[13px] font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

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

      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />
      <NewTaskModal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        projectId={DEV_PROJECT_ID}
        onCreated={(created) => {
          setTasks((prev) => [created, ...prev]);
          setNewModalOpen(false);
        }}
      />
    </div>
  );
};
