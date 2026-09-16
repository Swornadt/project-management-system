import { BaseCRUDService } from "../../shared/services/base.service";
import { getRepo } from "../../shared/db/repositories";
import { Content } from "../../entities/content.entity";
import { Approval } from "../../entities/approval.entity";
import { HttpError } from "../../shared/middleware/error.middleware";
import type { CreateContentDto, UpdateContentDto } from "./content.dto";

export class ContentService extends BaseCRUDService<Content, CreateContentDto, UpdateContentDto> {
  constructor() {
    super(Content, "content_id");
  }

  async submitForApproval(id: string): Promise<Content> {
    const content = await this.findOne(id);
    if (!content) throw new HttpError(404, "Content not found");
    if (content.status !== "draft") {
      throw new HttpError(409, `Cannot submit content from status '${content.status}'`);
    }
    const merged = this.repo().merge(content, { status: "pending_approval" });
    return this.repo().save(merged);
  }

  async decideApproval(
    id: string,
    reviewerId: string,
    decision: "approved" | "rejected",
    reason?: string
  ): Promise<Content> {
    const content = await this.findOne(id);
    if (!content) throw new HttpError(404, "Content not found");
    if (content.status !== "pending_approval") {
      throw new HttpError(409, `Cannot decide content from status '${content.status}'`);
    }
    if (reviewerId === content.author_id) {
      throw new HttpError(403, "Author cannot approve their own content");
    }
    if (decision === "rejected" && !reason) {
      throw new HttpError(400, "A reason is required when rejecting content");
    }

    const approvalRepo = getRepo(Approval);
    const approval = approvalRepo.create({
      content_id: content.content_id,
      reviewer_id: reviewerId,
      status: decision,
      reason: reason ?? null,
      decided_at: new Date(),
    });
    await approvalRepo.save(approval);

    const nextStatus = decision === "approved" ? "approved" : "draft";
    const merged = this.repo().merge(content, { status: nextStatus });
    return this.repo().save(merged);
  }

  async publish(id: string): Promise<Content> {
    const content = await this.findOne(id);
    if (!content) throw new HttpError(404, "Content not found");
    if (content.status !== "approved") {
      throw new HttpError(409, `Cannot publish content from status '${content.status}'`);
    }
    const merged = this.repo().merge(content, {
      status: "published",
      version: content.version + 1,
    });
    return this.repo().save(merged);
  }
}

export const contentService = new ContentService();