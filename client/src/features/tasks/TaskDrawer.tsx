import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { taskApi } from '../../api/axiosClient';
import type { ApiTaskResponse } from '../../api/taskTypes';

interface TaskDrawerProps {
  task: ApiTaskResponse | null;
  onClose: () => void;
  onTaskUpdated: (task: ApiTaskResponse) => void;
  onTaskDeleted: (id: string) => void;
}

const STATUS_OPTIONS = [
  'backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'cancelled',
];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

// Split so hooks below always run unconditionally — same fix as
// ArticleDrawer/NewContentModal (see earlier session notes).
const TaskDrawerContent: React.FC<{
  task: ApiTaskResponse;
  onClose: () => void;
  onTaskUpdated: (task: ApiTaskResponse) => void;
  onTaskDeleted: (id: string) => void;
}> = ({ task, onClose, onTaskUpdated, onTaskDeleted }) => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (status: string) => {
    setIsPending(true);
    setError(null);
    try {
      const res = await taskApi.updateStatus(task.task_id, status);
      onTaskUpdated(res.data);
    } catch {
      setError('Status update failed — you may not be allowed to move this task.');
    } finally {
      setIsPending(false);
    }
  };

  const handlePriorityChange = async (priority: string) => {
    setIsPending(true);
    setError(null);
    try {
      const res = await taskApi.update(task.task_id, { priority });
      onTaskUpdated(res.data);
    } catch {
      setError('Priority update failed — Manager/Admin only.');
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    setIsPending(true);
    try {
      await taskApi.remove(task.task_id);
      onTaskDeleted(task.task_id);
    } catch {
      setError('Delete failed — Manager/Admin only.');
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e7e4]">
          <span className="text-xs font-semibold text-[#9b9a97] uppercase tracking-wider">Task</span>
          <button onClick={onClose} className="p-1 hover:bg-[#f0eeec] rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <h2 className="text-lg font-semibold text-[#37352f]">{task.title}</h2>
          {task.description && (
            <p className="text-sm text-[#5d5b54] whitespace-pre-wrap">{task.description}</p>
          )}

          {error && (
            <p className="text-xs text-[#ba1a1a] bg-[#fde0e0] p-2 rounded-lg">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#9b9a97] uppercase">Status</label>
              <select
                value={task.status}
                disabled={isPending}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full text-xs font-medium p-2 border border-[#e8e7e4] rounded-lg mt-1 bg-white disabled:opacity-50"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#9b9a97] uppercase">Priority</label>
              <select
                value={task.priority}
                disabled={isPending}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="w-full text-xs font-medium p-2 border border-[#e8e7e4] rounded-lg mt-1 bg-white disabled:opacity-50"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#9b9a97] uppercase font-semibold block">Due date</span>
              <span className="text-[#37352f] mt-1 block">
                {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                {task.is_overdue && <span className="text-[#e03131] font-medium"> · Overdue</span>}
              </span>
            </div>
            <div>
              <span className="text-[#9b9a97] uppercase font-semibold block">Estimate</span>
              <span className="text-[#37352f] mt-1 block">
                {task.estimate_hours ? `${task.estimate_hours}h` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[#9b9a97] uppercase font-semibold block">Assignee</span>
              <span className="text-[#37352f] mt-1 block font-mono truncate">
                {task.assignee_id ? task.assignee_id.slice(0, 8) : 'Unassigned'}
              </span>
            </div>
            <div>
              <span className="text-[#9b9a97] uppercase font-semibold block">Labels</span>
              <span className="text-[#37352f] mt-1 block">
                {task.labels?.length ? task.labels.join(', ') : '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#e8e7e4] flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1 text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/40 px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete task</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-[#37352f] hover:bg-[#f0eeec] border border-[#e8e7e4] rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const TaskDrawer: React.FC<TaskDrawerProps> = (props) => {
  if (!props.task) return null;
  return <TaskDrawerContent {...props} task={props.task} />;
};
