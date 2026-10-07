import type { ApiContentResponse, ApiCreateContentDto, ApiUpdateContentDto } from "../../api/types";
import type { ContentItem } from "../../types";

// Bridges the API's shape (ApiContentResponse) and the UI's shape
// (ContentItem). Kept as its own file rather than reshaping either type to
// match the other, because they're for different jobs: the API type is a
// contract with the backend; the UI type carries display-only fields
// (avatar colors, icon, formatted "time ago" strings) the backend has no
// reason to know about.

const STATUS_API_TO_UI: Record<ApiContentResponse["status"], ContentItem["status"]> = {
  draft: "draft",
  pending_approval: "pending",
  approved: "approved",
  published: "published",
};

const STATUS_UI_TO_API: Record<ContentItem["status"], ApiContentResponse["status"]> = {
  draft: "draft",
  pending: "pending_approval",
  approved: "approved",
  published: "published",
};

// Builds the avatar fields from a display name.
function makeAuthor(name: string): ContentItem["author"] {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";
  return {
    name,
    initials,
    avatarBg: "bg-[#e6e0f5]",
    textColor: "text-[#5645d4]",
  };
}

// Used when the author's name isn't known (the user lookup is Admin/Manager
// only, so Employees can't resolve other people's names).
function placeholderAuthor(authorId: string): ContentItem["author"] {
  return makeAuthor(`User ${authorId.slice(0, 8)}`);
}

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const hours = diffMs / (1000 * 60 * 60);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function apiToContentItem(
  api: ApiContentResponse,
  projectNameOverride?: string,
  authorNameOverride?: string
): ContentItem {
  return {
    id: api.content_id,
    title: api.title,
    slug: api.slug,
    version: `v${api.version}`,
    project: api.project_id,
    projectName: projectNameOverride ?? api.project_id,
    status: STATUS_API_TO_UI[api.status],
    author: authorNameOverride ? makeAuthor(authorNameOverride) : placeholderAuthor(api.author_id),
    lastUpdated: relativeTime(api.updated_at),
    timestampHours: (Date.now() - new Date(api.updated_at).getTime()) / (1000 * 60 * 60),
    icon: "article",
    iconBg: "bg-[#e6e0f5]",
    iconColor: "text-[#5645d4]",
    body: api.body,
    // rejectionReason is intentionally left undefined here: GET /contents
    // doesn't return approval history, so a fresh fetch can't know the
    // last rejection reason. It only survives locally, right after a
    // reject call succeeds in the same session — see the note in
    // ContentDashboard once step 3 wires this up.
  };
}

export function contentItemToCreateDto(
  item: Pick<ContentItem, "title" | "slug" | "body" | "project">
): ApiCreateContentDto {
  return {
    project_id: item.project,
    title: item.title,
    slug: item.slug,
    body: item.body,
  };
}

export function contentItemToUpdateDto(
  item: Partial<Pick<ContentItem, "title" | "slug" | "body" | "project">>
): ApiUpdateContentDto {
  const dto: ApiUpdateContentDto = {};
  if (item.title !== undefined) dto.title = item.title;
  if (item.slug !== undefined) dto.slug = item.slug;
  if (item.body !== undefined) dto.body = item.body;
  if (item.project !== undefined) dto.project_id = item.project;
  return dto;
}

export { STATUS_UI_TO_API };
