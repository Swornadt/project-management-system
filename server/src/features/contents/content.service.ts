import { BaseCRUDService } from "../../shared/services/base.service";
import { getRepo } from "../../shared/db/repositories";
import { Content } from "../../entities/content.entity";
import {
  Approval,
  ApprovalStatus,
  ContentStatus,
} from "../../entities/approval.entity";
import { HttpError } from "../../shared/middleware/error.middleware";
import type { CreateContentDto, UpdateContentDto } from "./content.dto";

export class ContentService extends BaseCRUDService<
  Content,
  CreateContentDto,
  UpdateContentDto
> {
  constructor() {
    super(Content, "content_id");
  }

  async submitForApproval(id: string): Promise<Content> {
    const content = await this.findOne(id);
    if (!content) throw new HttpError(404, "Content not found");
    if (content.status !== ContentStatus.DRAFT) {
      throw new HttpError(
        409,
        `Cannot submit content from status '${content.status}'`
      );
    }
    const merged = this.repo().merge(content, {
      status: ContentStatus.PENDING_APPROVAL,
    });
    return this.repo().save(merged);
  }

  async decideApproval(
    id: string,
    reviewerId: string,
    decision: "approved" | "rejected",
    reason?: string
  ): Promise<Content> {
    if (decision !== "approved" && decision !== "rejected") {
      throw new HttpError(400, "Decision must be 'approved' or 'rejected'");
    }

    const content = await this.findOne(id);
    if (!content) throw new HttpError(404, "Content not found");
    if (content.status !== ContentStatus.PENDING_APPROVAL) {
      throw new HttpError(
        409,
        `Cannot decide content from status '${content.status}'`
      );
    }
    if (reviewerId === content.author_id) {
      throw new HttpError(403, "Author cannot approve their own content");
    }
    if (decision === "rejected" && !reason) {
      throw new HttpError(
        400,
        "A reason is required when rejecting content"
      );
    }

    const approvalRepo = getRepo(Approval);
    const approval = approvalRepo.create({
      content_id: content.content_id,
      submitted_by: content.author_id,
      reviewer_id: reviewerId,
      status: decision as ApprovalStatus,
      reason: reason ?? null,
      decided_at: new Date(),
    });
    await approvalRepo.save(approval);

    const nextStatus =
      decision === "approved" ? ContentStatus.APPROVED : ContentStatus.DRAFT;
    const merged = this.repo().merge(content, { status: nextStatus });
    return this.repo().save(merged);
  }

  async publish(id: string): Promise<Content> {
    const content = await this.findOne(id);
    if (!content) throw new HttpError(404, "Content not found");
    if (content.status !== ContentStatus.APPROVED) {
      throw new HttpError(
        409,
        `Cannot publish content from status '${content.status}'`
      );
    }
    const merged = this.repo().merge(content, {
      status: ContentStatus.PUBLISHED,
      version: content.version + 1,
    });
    return this.repo().save(merged);
  }
}

export const contentService = new ContentService();