// server/src/features/contents/content.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../shared/middleware/error.middleware";
import { ContentService } from "./content.service";
import type { Content } from "../../entities/content.entity";

const mockRepo = {
  findOne: vi.fn(),
  create: vi.fn((data: any) => data),
  save: vi.fn(async (entity: any) => entity),
  merge: vi.fn((target: any, source: any) => Object.assign(target, source)),
};

vi.mock("../../shared/db/repositories", () => ({
  getRepo: () => mockRepo,
}));

function makeContent(overrides: Partial<Content> = {}): Content {
  return {
    content_id: "content-1",
    project_id: "project-1",
    author_id: "author-1",
    title: "Test content",
    slug: "test-content",
    body: "...",
    status: "draft",
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as Content;
}

describe("ContentService", () => {
  let service: ContentService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.create.mockImplementation((data: any) => data);
    mockRepo.save.mockImplementation(async (entity: any) => entity);
    mockRepo.merge.mockImplementation((target: any, source: any) => Object.assign(target, source));
    service = new ContentService();
  });

  describe("submitForApproval", () => {
    it("throws 404 if content does not exist", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.submitForApproval("missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 409 if content is not in draft", async () => {
      mockRepo.findOne.mockResolvedValue(makeContent({ status: "pending_approval" }));
      await expect(service.submitForApproval("content-1")).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("moves draft to pending_approval", async () => {
      mockRepo.findOne.mockResolvedValue(makeContent({ status: "draft" }));
      const result = await service.submitForApproval("content-1");
      expect(result.status).toBe("pending_approval");
    });
  });

  describe("decideApproval", () => {
    it("throws 404 if content does not exist", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.decideApproval("missing", "reviewer-1", "approved")
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 409 if content is not pending_approval", async () => {
      mockRepo.findOne.mockResolvedValue(makeContent({ status: "draft" }));
      await expect(
        service.decideApproval("content-1", "reviewer-1", "approved")
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("throws 403 if the reviewer is the author", async () => {
      mockRepo.findOne.mockResolvedValue(
        makeContent({ status: "pending_approval", author_id: "author-1" })
      );
      await expect(
        service.decideApproval("content-1", "author-1", "approved")
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("throws 400 if rejecting without a reason", async () => {
      mockRepo.findOne.mockResolvedValue(makeContent({ status: "pending_approval" }));
      await expect(
        service.decideApproval("content-1", "reviewer-1", "rejected")
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("sets status to approved on approval", async () => {
      mockRepo.findOne.mockResolvedValue(makeContent({ status: "pending_approval" }));
      const result = await service.decideApproval("content-1", "reviewer-1", "approved");
      expect(result.status).toBe("approved");
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "approved", reviewer_id: "reviewer-1" })
      );
    });

    it("returns rejected content to draft, with the reason recorded", async () => {
      mockRepo.findOne.mockResolvedValue(makeContent({ status: "pending_approval" }));
      const result = await service.decideApproval(
        "content-1",
        "reviewer-1",
        "rejected",
        "needs another pass"
      );
      expect(result.status).toBe("draft");
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "rejected", reason: "needs another pass" })
      );
    });
  });

  describe("publish", () => {
    it("throws 404 if content does not exist", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.publish("missing")).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 409 if content is not approved", async () => {
      mockRepo.findOne.mockResolvedValue(makeContent({ status: "draft" }));
      await expect(service.publish("content-1")).rejects.toMatchObject({ statusCode: 409 });
    });

    it("publishes and bumps the version", async () => {
      mockRepo.findOne.mockResolvedValue(makeContent({ status: "approved", version: 1 }));
      const result = await service.publish("content-1");
      expect(result.status).toBe("published");
      expect(result.version).toBe(2);
    });
  });
});