import React, { useState } from 'react';
import { X } from 'lucide-react';
import { projectApi } from '../../api/axiosClient';
import type { ApiProjectResponse } from '../../api/types';
import { PRIORITIES, STATUSES, extractErrorMessage } from './projectUi';

interface ProjectFormModalProps {
  /** Pass a project to edit it; omit to create a new one. */
  project?: ApiProjectResponse;
  onClose: () => void;
  onSaved: (project: ApiProjectResponse) => void;
}

const KEY_PATTERN = /^[A-Za-z0-9_-]+$/;
const FORM_STATUSES = STATUSES.filter((s) => s !== 'Archived'); // archiving has its own action

const inputClass =
  'w-full text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4] bg-white';
const labelClass = 'font-semibold text-[#5d5b54] block mb-1';

// Mount this only while open — state is initialised from `project` once, so a
// fresh mount per open keeps the form in sync without effects.
export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({ project, onClose, onSaved }) => {
  const isEdit = Boolean(project);

  const [name, setName] = useState(project?.name ?? '');
  const [keyCode, setKeyCode] = useState(project?.key_code ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState(project?.status ?? 'Planned');
  const [priority, setPriority] = useState(project?.priority ?? 'Medium');
  const [startDate, setStartDate] = useState(project?.start_date?.slice(0, 10) ?? '');
  const [dueDate, setDueDate] = useState(project?.due_date?.slice(0, 10) ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const validate = (): string | null => {
    if (name.trim().length < 3) return 'Name must be at least 3 characters.';
    if (!isEdit) {
      const key = keyCode.trim();
      if (key.length < 2) return 'Key must be at least 2 characters.';
      if (!KEY_PATTERN.test(key)) return 'Key can only contain letters, numbers, hyphens and underscores.';
    }
    if (startDate && dueDate && dueDate < startDate) return 'Due date cannot be before start date.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setIsSaving(true);
    setError(null);

    const shared = {
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      start_date: startDate || undefined,
      due_date: dueDate || undefined,
    };

    try {
      const res = isEdit
        ? await projectApi.update(project!.project_id, shared)
        : await projectApi.create({ ...shared, key_code: keyCode.trim() });
      onSaved(res.data);
    } catch (err) {
      setError(extractErrorMessage(err));
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-[#e8e7e4] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e7e4]">
          <h2 className="text-sm font-semibold text-[#37352f]">
            {isEdit ? 'Edit project' : 'New project'}
          </h2>
          <button onClick={onClose} className="text-[#9b9a97] hover:text-[#37352f]" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                maxLength={100}
              />
            </div>
            <div>
              <label className={labelClass}>Key</label>
              <input
                value={keyCode}
                onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
                disabled={isEdit}
                placeholder="CMS"
                className={`${inputClass} font-mono ${isEdit ? 'bg-[#f7f6f5] text-[#9b9a97]' : ''}`}
                maxLength={20}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                {FORM_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          {error && <p className="text-[#ba1a1a]">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[#5d5b54] hover:bg-[#f0eeec]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#5645d4] hover:bg-[#4534b3] text-white disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
