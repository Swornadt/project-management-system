import type { ActiveNavKey } from "../types";

// Single source of truth for nav-key <-> URL path. Kept separate from
// types.ts so routing concerns don't bleed into the plain data-shape file.
export const NAV_PATHS: Record<ActiveNavKey, string> = {
  "content-publishing": "/content",
  "task-kanban-board": "/tasks",
  "approvals-and-governance": "/approvals",
  "executive-overview": "/overview",
  "projects-and-roadmaps": "/projects",
  "sprint-planner": "/sprints",
};

const PATH_TO_NAV: Record<string, ActiveNavKey> = Object.fromEntries(
  Object.entries(NAV_PATHS).map(([nav, path]) => [path.slice(1), nav as ActiveNavKey])
);

export const DEFAULT_NAV: ActiveNavKey = "content-publishing";

/** Resolves a raw ":navKey" URL param into a real ActiveNavKey, falling
 * back to the default for anything unrecognized (typos, stale bookmarks,
 * removed sections) instead of rendering a blank or crashing. */
export function resolveNavKey(rawParam: string | undefined): ActiveNavKey {
  if (!rawParam) return DEFAULT_NAV;
  return PATH_TO_NAV[rawParam] ?? DEFAULT_NAV;
}
