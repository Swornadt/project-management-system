import React, { useEffect, useRef, useState } from 'react';
import { FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { fileApi, type ApiFile, type FileScope } from '../../api/fileApi';
import { getStoredUser } from '../../api/axiosClient';

interface FileAttachmentsProps {
  scope: FileScope;
  id: string;
}

// Mirrors ATTACHMENT_MIMES / MAX_FILE_SIZE_MB in server files.validation.ts.
// UI-side convenience only — the server re-validates the real file type.
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'txt', 'csv', 'doc', 'docx'];
const MAX_MB = 25;

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return msg;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ListResult {
  key: string;
  files: ApiFile[];
  error?: string;
}

export const FileAttachments: React.FC<FileAttachmentsProps> = ({ scope, id }) => {
  const user = getStoredUser();
  const inputRef = useRef<HTMLInputElement>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<ListResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const requestKey = `${scope}:${id}:${reloadKey}`;
  // Spinner only for the first load of this scope+id; after an upload/delete the
  // current list stays visible while it refetches.
  const loading = result === null || !result.key.startsWith(`${scope}:${id}:`);

  useEffect(() => {
    let cancelled = false;
    fileApi
      .list(scope, id)
      .then((res) => {
        if (!cancelled) setResult({ key: requestKey, files: res.data });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key: requestKey, files: [], error: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [scope, id, requestKey]);

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after an error
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXT.includes(ext)) {
      setActionError(`".${ext}" files aren't allowed. Allowed: ${ALLOWED_EXT.join(', ')}.`);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setActionError(`File is too large (max ${MAX_MB} MB).`);
      return;
    }

    setUploading(true);
    setActionError(null);
    try {
      await fileApi.upload(scope, id, file);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (f: ApiFile) => {
    // Open the tab synchronously (inside the click) so popup blockers allow it,
    // then point it at the downloaded blob once the request finishes.
    const tab = window.open('', '_blank');
    setActionError(null);
    try {
      const blob = await fileApi.fetchBlob(f.file_id);
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      setActionError(errorMessage(err));
    }
  };

  const handleDelete = async (f: ApiFile) => {
    if (!window.confirm(`Delete "${f.original_name}"?`)) return;
    setActionError(null);
    try {
      await fileApi.remove(f.file_id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const files = result?.files ?? [];

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#37352f] uppercase tracking-wider flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          Files{result && !result.error ? ` (${files.length})` : ''}
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e8e7e4] text-xs font-medium text-[#37352f] hover:bg-[#f0eeec] disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXT.map((e) => `.${e}`).join(',')}
          onChange={handlePick}
          className="hidden"
        />
      </div>

      {actionError && <p className="text-xs text-[#ba1a1a]">{actionError}</p>}

      {loading ? (
        <p className="text-xs text-[#9b9a97] py-2">Loading files…</p>
      ) : result?.error ? (
        <p className="text-xs text-[#ba1a1a] py-2">Couldn't load files: {result.error}</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-[#9b9a97] py-2">No files attached.</p>
      ) : (
        <ul className="divide-y divide-[#f1efed] border border-[#e8e7e4] rounded-lg">
          {files.map((f) => (
            <li key={f.file_id} className="flex items-center gap-2.5 px-3 py-2">
              <FileText className="w-4 h-4 text-[#9b9a97] shrink-0" />
              <button
                onClick={() => handleOpen(f)}
                className="min-w-0 flex-1 text-left text-[13px] text-[#37352f] hover:text-[#5645d4] truncate"
                title={f.original_name}
              >
                {f.original_name}
              </button>
              <span className="text-[11px] text-[#9b9a97] shrink-0">{formatSize(f.size_bytes)}</span>
              {/* The API only lets the uploader delete their own file. */}
              {user?.user_id === f.uploaded_by && (
                <button
                  onClick={() => handleDelete(f)}
                  className="text-[#9b9a97] hover:text-[#ba1a1a] shrink-0"
                  aria-label={`Delete ${f.original_name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
