import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationApi, type ApiNotification } from '../../api/notificationApi';

const POLL_MS = 60_000;

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Unread badge: fetch once, then poll. Failures are silent — a badge that
  // can't refresh shouldn't interrupt whatever the user is doing.
  const refreshCount = useCallback(() => {
    notificationApi
      .unreadCount()
      .then(setUnread)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(t);
  }, [refreshCount]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoading(true);
    setError(null);
    notificationApi
      .list({ limit: 20 })
      .then((res) => setItems(res.data))
      .catch(() => setError("Couldn't load notifications."))
      .finally(() => setLoading(false));
    refreshCount();
  };

  const handleRead = async (n: ApiNotification) => {
    if (n.is_read) return;
    // Optimistic: flip locally, roll back if the API refuses.
    setItems((prev) => prev.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: true } : x)));
    setUnread((c) => Math.max(0, c - 1));
    try {
      await notificationApi.markRead(n.notification_id);
    } catch {
      setItems((prev) => prev.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: false } : x)));
      refreshCount();
    }
  };

  const handleReadAll = async () => {
    try {
      await notificationApi.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      setUnread(0);
    } catch {
      setError("Couldn't mark all as read.");
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={toggle}
        title="Notifications"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative p-1.5 rounded-lg hover:bg-[#f0eeec] hover:text-[#171c1f] transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#e03131] text-white text-[10px] font-semibold leading-4 text-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-[#e8e7e4] rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#e8e7e4]">
            <span className="text-xs font-semibold text-[#37352f]">Notifications</span>
            <button
              onClick={handleReadAll}
              disabled={unread === 0}
              className="flex items-center gap-1 text-[11px] text-[#5645d4] hover:underline disabled:text-[#9b9a97] disabled:no-underline"
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-xs text-[#9b9a97]">Loading…</p>
            ) : error ? (
              <p className="px-4 py-8 text-center text-xs text-[#ba1a1a]">{error}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-[#9b9a97]">You're all caught up.</p>
            ) : (
              <ul className="divide-y divide-[#f1efed]">
                {items.map((n) => (
                  <li key={n.notification_id}>
                    <button
                      onClick={() => handleRead(n)}
                      className={`w-full text-left px-3.5 py-2.5 flex gap-2.5 hover:bg-[#f0f4f8] transition-colors ${
                        n.is_read ? '' : 'bg-[#f6f4ff]'
                      }`}
                    >
                      <span
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                          n.is_read ? 'bg-transparent' : 'bg-[#5645d4]'
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-[#37352f] truncate">{n.title}</span>
                        {n.message && (
                          <span className="block text-xs text-[#5d5b54] line-clamp-2">{n.message}</span>
                        )}
                        <span className="block text-[11px] text-[#9b9a97] mt-0.5">{timeAgo(n.created_at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
