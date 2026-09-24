import React, { useState } from 'react';
import { X } from 'lucide-react';
import { taskApi } from '../../api/axiosClient';
import type { ApiTaskResponse } from '../../api/taskTypes';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | undefined;
  onCreated: (task: ApiTaskResponse) => void;
}

const NewTaskModalContent: React.FC<{
  onClose: () => void;
  projectId: string;
  onCreated: (task: ApiTaskResponse) => void;
}> = ({ onClose, projectId, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await taskApi.create({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate || undefined,
      });
      onCreated(res.data);
    } catch {
      setError('Could not create task — Manager/Admin only, per the SRS permission model.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e7e4]">
          <h2 className="text-sm font-semibold text-[#37352f]">New Task</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#f0eeec] rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div>
            <label className="font-semibold text-[#5d5b54] block mb-1">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4]"
            />
          </div>
          <div>
            <label className="font-semibold text-[#5d5b54] block mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#5d5b54] block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg bg-white outline-none focus:border-[#5645d4]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-[#5d5b54] block mb-1">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4]"
              />
            </div>
          </div>

          {error && <p className="text-[#ba1a1a] bg-[#fde0e0] p-2 rounded-lg">{error}</p>}

          <div className="pt-2 border-t border-[#e8e7e4] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-medium text-[#5d5b54] hover:bg-[#f0eeec] rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="px-4 py-2 text-xs font-medium bg-[#5645d4] hover:bg-[#4534b3] text-white rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const NewTaskModal: React.FC<NewTaskModalProps> = ({ isOpen, onClose, projectId, onCreated }) => {
  if (!isOpen) return null;
  if (!projectId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 text-xs text-center space-y-3">
          <p className="text-[#ba1a1a]">No project configured — set VITE_DEV_PROJECT_ID in client/.env</p>
          <button onClick={onClose} className="px-3.5 py-2 text-xs font-medium text-[#5d5b54] hover:bg-[#f0eeec] rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }
  return <NewTaskModalContent onClose={onClose} projectId={projectId} onCreated={onCreated} />;
};
