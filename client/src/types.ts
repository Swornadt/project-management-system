export type ContentStatus = 'all' | 'draft' | 'pending' | 'approved' | 'published';

export type ProjectId = 'all' | 'core-cms' | 'security' | 'mobile' | 'cloud' | 'strategy';

export type SortOption = 'newest' | 'oldest' | 'alphabetical';

export type ViewStateMode = 'normal' | 'skeleton' | 'empty';

export interface Author {
  name: string;
  initials: string;
  avatarBg: string;
  textColor: string;
  avatarUrl?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  version?: string;
  project: string;
  projectName: string;
  status: 'draft' | 'pending' | 'approved' | 'published';
  author: Author;
  lastUpdated: string;
  timestampHours: number;
  icon: 'article' | 'shield' | 'palette' | 'description' | 'terminal' | 'verified';
  iconBg: string;
  iconColor: string;
  summary?: string;
  body?: string;
  views?: number;
  tags?: string[];
}

export type ActiveNavKey =
  | 'content-publishing'
  | 'task-kanban-board'
  | 'approvals-and-governance'
  | 'executive-overview'
  | 'projects-and-roadmaps'
  | 'sprint-planner';
