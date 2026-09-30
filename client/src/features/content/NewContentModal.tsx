import React, { useEffect, useState } from 'react';
import {
  X,
  FilePlus,
  FileText,
  Shield,
  Palette,
  Terminal,
  CheckCircle2,
} from 'lucide-react';
import { projectApi } from '../../api/axiosClient';
import type { ApiProjectResponse } from '../../api/types';
import type { ContentItem } from '../../types';
import { AUTHORS } from '../../data/mockContent';

export interface NewContentPayload {
  title: string;
  slug: string;
  body?: string;
  projectId?: string;
}

interface NewContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateItem: (payload: NewContentPayload) => Promise<void>;
}

interface NewContentModalContentProps {
  onClose: () => void;
  onCreateItem: (payload: NewContentPayload) => Promise<void>;
}

const generateSlug = (
  titleValue: string,
  activeProject: string,
  projectLookup: ApiProjectResponse[]
) => {
  const selectedProject = projectLookup.find((item) => item.project_id === activeProject);
  const projectSlugSegment =
    (selectedProject?.key_code ?? selectedProject?.name ?? 'project')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project';

  return (
    '/' +
    projectSlugSegment +
    '/' +
    titleValue
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
  );
};

const NewContentModalContent: React.FC<NewContentModalContentProps> = ({
  onClose,
  onCreateItem,
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [project, setProject] = useState('');
  const [projectOptions, setProjectOptions] = useState<ApiProjectResponse[]>([]);
  const [authorKey, setAuthorKey] = useState<keyof typeof AUTHORS>('eleanor');
  const [icon, setIcon] = useState<ContentItem['icon']>('article');
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    projectApi
      .list({ per_page: 100 })
      .then((res) => {
        if (cancelled) return;
        const projects = res.data ?? [];
        setProjectOptions(projects);
        if (projects.length === 0) {
          setProject('');
          return;
        }

        setProject((currentProject) => {
          if (currentProject && projects.some((item) => item.project_id === currentProject)) {
            return currentProject;
          }
          return projects[0].project_id;
        });
      })
      .catch(() => {
        if (!cancelled) setProjectOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!title.trim()) return;
    setSlug((currentSlug) => {
      const generatedSlug = generateSlug(title, project, projectOptions);
      if (!currentSlug || currentSlug === generatedSlug || currentSlug.startsWith('/')) {
        return generatedSlug;
      }
      return currentSlug;
    });
  }, [title, project, projectOptions]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(generateSlug(val, project, projectOptions));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onCreateItem({
        title: title.trim(),
        slug: slug || `/docs/${title.toLowerCase().replace(/\s+/g, '-')}`,
        body:
          summary.trim() ||
          `### ${title}\nInitial draft documentation initialized.`,
        projectId: project || undefined,
      });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong — please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#e8e7e4] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e8e7e4] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#e6e0f5] text-[#5645d4] flex items-center justify-center">
              <FilePlus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-[#37352f]">Create New Content</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9b9a97] hover:text-[#37352f] hover:bg-[#f0eeec] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-[#5d5b54] block mb-1">
              Title <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Edge Compute Worker Migration Guidelines"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full text-[13px] px-3 py-2 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4] shadow-2xs"
            />
          </div>

          <div>
            <label className="font-semibold text-[#5d5b54] block mb-1">URL Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="/announcements/my-new-post"
              className="w-full text-xs font-mono px-3 py-2 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4] bg-[#f7f6f5]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#5d5b54] block mb-1">Target Project</label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                disabled={projectOptions.length === 0}
                className="w-full text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg bg-white outline-none focus:border-[#5645d4] disabled:bg-[#f6f5f4] disabled:text-[#9b9a97]"
              >
                {projectOptions.length === 0 ? (
                  <option value="">No projects available</option>
                ) : (
                  projectOptions.map((item) => (
                    <option key={item.project_id} value={item.project_id}>
                      {item.name}
                    </option>
                  ))
                )}
              </select>
            </div>

          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#5d5b54] block mb-1">Author</label>
              <select
                value={authorKey}
                onChange={(e) => setAuthorKey(e.target.value as keyof typeof AUTHORS)}
                className="w-full text-xs px-2.5 py-2 border border-[#e8e7e4] rounded-lg bg-white outline-none focus:border-[#5645d4]"
              >
                <option value="eleanor">Eleanor Vance (Operations Lead)</option>
                <option value="emily">Emily Watson</option>
                <option value="sarah">Sarah Jenkins</option>
                <option value="david">David Kim</option>
                <option value="marcus">Marcus Chen</option>
                <option value="elena">Elena Rostova</option>
              </select>
            </div>
          </div>

          <p className="text-[11px] text-[#9b9a97] -mt-2">
            Project selection is pulling from the live backend; authors remain a UI-only default until the user directory is available.
          </p>

          <div>
            <label className="font-semibold text-[#5d5b54] block mb-1">Icon Category</label>
            <div className="grid grid-cols-6 gap-2">
              {[
                { id: 'article', label: 'Article', icon: FileText },
                { id: 'shield', label: 'Security', icon: Shield },
                { id: 'palette', label: 'Design', icon: Palette },
                { id: 'description', label: 'Doc', icon: FileText },
                { id: 'terminal', label: 'Dev', icon: Terminal },
                { id: 'verified', label: 'Audit', icon: CheckCircle2 },
              ].map((ic) => {
                const IconComponent = ic.icon;
                const isSelected = icon === ic.id;
                return (
                  <button
                    key={ic.id}
                    type="button"
                    onClick={() => setIcon(ic.id as ContentItem['icon'])}
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'border-[#5645d4] bg-[#e6e0f5] text-[#5645d4]'
                        : 'border-[#e8e7e4] text-[#5d5b54] hover:bg-[#f0f4f8]'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-[10px]">{ic.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#5d5b54] block mb-1">Summary / Abstract</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of this publication..."
              className="w-full text-xs p-2.5 border border-[#e8e7e4] rounded-lg outline-none focus:border-[#5645d4]"
            />
          </div>

          {submitError && (
            <p className="text-xs text-[#ba1a1a] bg-[#fde0e0] p-2 rounded-lg">{submitError}</p>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-[#e8e7e4] flex items-center justify-end gap-2">
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
              className="px-4 py-2 text-xs font-medium bg-[#5645d4] hover:bg-[#4534b3] text-white rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create Publication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Gates on isOpen, then hands off to a component whose hooks always run
// unconditionally — same fix as ArticleDrawer's wrapper, same reason.
export const NewContentModal: React.FC<NewContentModalProps> = ({
  isOpen,
  onClose,
  onCreateItem,
}) => {
  if (!isOpen) return null;
  return <NewContentModalContent onClose={onClose} onCreateItem={onCreateItem} />;
};
