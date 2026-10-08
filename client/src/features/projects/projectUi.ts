import type { ApiProjectResponse, ApiUserProfile } from '../../api/types';

// Mirrors PROJECT_STATUSES / PROJECT_PRIORITIES in server project.dto.ts.
export const STATUSES = ['Planned', 'Active', 'On Hold', 'Completed', 'Archived'] as const;
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export const STATUS_STYLE: Record<string, string> = {
  Planned: 'bg-[#dcecfa] text-[#0075de]',
  Active: 'bg-[#d9f3e1] text-[#1aae39]',
  'On Hold': 'bg-[#fef7d6] text-[#dd5b00]',
  Completed: 'bg-[#e6e0f5] text-[#5645d4]',
  Archived: 'bg-[#f0eeec] text-[#5d5b54]',
};

export const PRIORITY_DOT: Record<string, string> = {
  Critical: 'bg-[#e03131]',
  High: 'bg-[#dd5b00]',
  Medium: 'bg-[#f5d75e]',
  Low: 'bg-[#a4a097]',
};

export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

// Dates arrive as "YYYY-MM-DD"; parse manually so timezones can't shift the day.
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function personName(u?: { first_name: string; last_name: string } | null): string {
  return u ? `${u.first_name} ${u.last_name}`.trim() : '—';
}

// UI-only gates for usability. The API enforces the real rules (SRS §4):
// Admin/Manager can create; Admin or the owning Manager can edit/archive.
export function canCreateProject(user: ApiUserProfile | null): boolean {
  const role = user?.role_name?.toLowerCase();
  return role === 'admin' || role === 'manager';
}

export function canManageProject(project: ApiProjectResponse, user: ApiUserProfile | null): boolean {
  const role = user?.role_name?.toLowerCase();
  if (role === 'admin') return true;
  return role === 'manager' && project.owner_id === user?.user_id;
}
