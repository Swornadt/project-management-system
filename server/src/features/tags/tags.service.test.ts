import { describe, it, expect, vi, beforeEach } from "vitest";
import { TagsService } from "./tags.service";
import type { Tag } from "../../entities/tag.entity";
import type { ContentTag } from "../../entities/content-tag.entity";

const mockRepo = {
  findOne: vi.fn(),
  create: vi.fn((data: any) => data),
  save: vi.fn(async (entity: any) => entity),
  merge: vi.fn((target: any, source: any) => Object.assign(target, source)),
};

const contentTagRepo = {
  findOne: vi.fn(),
  create: vi.fn((data: any) => data),
  save: vi.fn(async (entity: any) => entity),
  delete: vi.fn(),
  find: vi.fn(),
};

// getRepo is called with an entity class; route it to the right mock based
// on which one's asked for, same as the real repositories.ts would.
vi.mock("../../shared/db/repositories", () => ({
  getRepo: (entity: unknown) => {
    const name = (entity as { name?: string })?.name;
    return name === "ContentTag" ? contentTagRepo : mockRepo;
  },
}));

function makeContentTag(overrides: Partial<ContentTag> = {}): ContentTag {
  return {
    content_id: "content-1",
    tag_id: "tag-1",
    created_at: new Date(),
    ...overrides,
  } as ContentTag;
}

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    tag_id: "tag-1",
    name: "Backend",
    slug: "backend",
    created_at: new Date(),
    ...overrides,
  } as Tag;
}

describe("TagsService", () => {
  let service: TagsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.create.mockImplementation((data: any) => data);
    mockRepo.save.mockImplementation(async (entity: any) => entity);
    mockRepo.merge.mockImplementation((target: any, source: any) => Object.assign(target, source));
    service = new TagsService();
  });

  describe("create", () => {
    it("throws 409 when a tag with the same name already exists (case-insensitive)", async () => {
      mockRepo.findOne.mockResolvedValue(makeTag({ name: "Backend" }));
      await expect(
        service.create({ name: "backend", slug: "backend-2" })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("creates when no name collision exists", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.create({ name: "Frontend", slug: "frontend" });
      expect(result).toMatchObject({ name: "Frontend", slug: "frontend" });
    });
  });

  describe("update", () => {
    it("allows renaming a tag to its own current name (excludes itself from the collision check)", async () => {
      mockRepo.findOne
        .mockResolvedValueOnce(makeTag({ tag_id: "tag-1", name: "Backend" })) // duplicate check
        .mockResolvedValueOnce(makeTag({ tag_id: "tag-1", name: "Backend" })); // base.service's findOne
      const result = await service.update("tag-1", { name: "Backend" });
      expect(result).not.toBeNull();
    });

    it("throws 409 when renaming to a name owned by a different tag", async () => {
      mockRepo.findOne.mockResolvedValue(makeTag({ tag_id: "tag-2", name: "Frontend" }));
      await expect(
        service.update("tag-1", { name: "Frontend" })
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe("attachToContent", () => {
    it("throws 404 if the tag doesn't exist", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.attachToContent("missing-tag", "content-1")
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 409 if already attached", async () => {
      mockRepo.findOne.mockResolvedValue(makeTag());
      contentTagRepo.findOne.mockResolvedValue(makeContentTag());
      await expect(
        service.attachToContent("tag-1", "content-1")
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("attaches the tag when not already linked", async () => {
      mockRepo.findOne.mockResolvedValue(makeTag());
      contentTagRepo.findOne.mockResolvedValue(null);
      const result = await service.attachToContent("tag-1", "content-1");
      expect(result.tag_id).toBe("tag-1");
      expect(result.content_id).toBe("content-1");
    });
  });

  describe("detachFromContent", () => {
    it("returns false if nothing was deleted", async () => {
      contentTagRepo.delete.mockResolvedValue({ affected: 0 });
      const result = await service.detachFromContent("tag-1", "content-1");
      expect(result).toBe(false);
    });

    it("returns true when the link is removed", async () => {
      contentTagRepo.delete.mockResolvedValue({ affected: 1 });
      const result = await service.detachFromContent("tag-1", "content-1");
      expect(result).toBe(true);
    });
  });

  describe("listTagsForContent", () => {
    it("returns the tags attached to a content item", async () => {
      contentTagRepo.find.mockResolvedValue([
        { ...makeContentTag(), tag: makeTag({ tag_id: "tag-1", name: "Backend" }) },
        { ...makeContentTag({ tag_id: "tag-2" }), tag: makeTag({ tag_id: "tag-2", name: "Frontend" }) },
      ]);
      const result = await service.listTagsForContent("content-1");
      expect(result.map((t) => t.name)).toEqual(["Backend", "Frontend"]);
    });
  });
});
