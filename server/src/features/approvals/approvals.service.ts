import { AppDataSource } from "../../shared/db/data-source";
import { BaseCRUDService } from "../../shared/services/base.service";
import { getRepo } from "../../shared/db/repositories";
import {
  Approval,
  ApprovalStatus,
  PublishMode,
  ContentStatus,
} from "../../entities/approval.entity";
import { Content } from "../../entities/content.entity";
import { ActivityLog } from "../../entities/activity-log.entity";
import { Notification } from "../../entities/notification.entity";
import { User } from "../../entities/user.entity";
import { Role } from "../../entities/role.entity";
import { HttpError } from "../../shared/middleware/error.middleware";
import type { PaginationParams, PaginatedResponse } from "../../shared/types";
import type { ApproveDto, RejectDto, SubmitForApprovalDto } from "./approvals.dto";

export class ApprovalsService extends BaseCRUDService<Approval> {
  constructor() {
    super(Approval, "approval_id");
  }

  async submit(
    contentId: string,
    submitterId: string,
    dto: SubmitForApprovalDto = {}
  ): Promise<Approval> {
    const content = await getRepo(Content).findOne({
      where: { content_id: contentId },
    });
    if (!content) throw new HttpError(404, "Content not found");

    if (
      content.status !== ContentStatus.DRAFT &&
      content.status !== ContentStatus.REJECTED
    ) {
      throw new HttpError(
        409,
        `Cannot submit content with status '${content.status}' for approval`
      );
    }

    const pending = await this.repo().findOne({
      where: { content_id: contentId, status: ApprovalStatus.PENDING },
    });
    if (pending) throw new HttpError(409, "Content already has a pending approval");

    return AppDataSource.transaction(async (mgr) => {
      const approvalRepo = mgr.getRepository(Approval);
      const contentRepo = mgr.getRepository(Content);
      const logRepo = mgr.getRepository(ActivityLog);
      const notifRepo = mgr.getRepository(Notification);

      const approval = approvalRepo.create({
        content_id: contentId,
        submitted_by: submitterId,
        status: ApprovalStatus.PENDING,
        notes: dto?.notes ?? null,
      });
      const saved = await approvalRepo.save(approval);

      await contentRepo.update(contentId, {
        status: ContentStatus.PENDING_APPROVAL,
      });

      await logRepo.save(
        logRepo.create({
          project_id: content.project_id,
          user_id: submitterId,
          action: "content.submitted",
          entity_type: "content",
          entity_id: contentId,
          description: `Submitted "${content.title}" for approval`,
        })
      );

      const reviewers = await mgr
        .getRepository(User)
        .createQueryBuilder("u")
        .innerJoin(Role, "r", "r.role_id = u.role_id")
        .where("r.name IN (:...names)", { names: ["Manager", "Admin"] })
        .andWhere("u.status = :s", { s: "active" })
        .getMany();

      if (reviewers.length > 0) {
        await notifRepo.save(
          reviewers.map((r) =>
            notifRepo.create({
              user_id: r.user_id,
              type: "approval.submitted",
              title: "New content awaiting review",
              message: `"${content.title}" has been submitted for approval.`,
            })
          )
        );
      }

      return saved;
    });
  }

  async approve(
    approvalId: string,
    reviewerId: string,
    dto: ApproveDto
  ): Promise<Approval> {
    const approval = await this.findOne(approvalId);
    if (!approval) throw new HttpError(404, "Approval not found");
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new HttpError(409, `Approval already ${approval.status}`);
    }
    if (approval.submitted_by === reviewerId) {
      throw new HttpError(403, "You cannot approve your own submission");
    }

    const publishMode =
      dto.publish === "scheduled" ? PublishMode.SCHEDULED : PublishMode.IMMEDIATE;

    let scheduledFor: Date | null = null;
    if (publishMode === PublishMode.SCHEDULED) {
      if (!dto.scheduled_for) {
        throw new HttpError(
          400,
          "Field 'scheduled_for' is required when publish is 'scheduled'"
        );
      }
      scheduledFor = new Date(dto.scheduled_for);
      if (isNaN(scheduledFor.getTime())) {
        throw new HttpError(400, "'scheduled_for' is not a valid date");
      }
      if (scheduledFor.getTime() <= Date.now()) {
        throw new HttpError(400, "'scheduled_for' must be in the future");
      }
    }

    return AppDataSource.transaction(async (mgr) => {
      const approvalRepo = mgr.getRepository(Approval);
      const contentRepo = mgr.getRepository(Content);
      const logRepo = mgr.getRepository(ActivityLog);
      const notifRepo = mgr.getRepository(Notification);

      const now = new Date();

      approval.reviewer_id = reviewerId;
      approval.status = ApprovalStatus.APPROVED;
      approval.decided_at = now;
      approval.publish_mode = publishMode;
      approval.scheduled_for = scheduledFor;
      const saved = await approvalRepo.save(approval);

      const content = await contentRepo.findOne({
        where: { content_id: approval.content_id },
      });
      if (!content) throw new HttpError(404, "Content not found");

      if (publishMode === PublishMode.IMMEDIATE) {
        await contentRepo.update(content.content_id, {
          status: ContentStatus.PUBLISHED,
          published_at: now,
          scheduled_for: null,
        });
        approval.published_at = now;
        await approvalRepo.save(approval);
      } else {
        await contentRepo.update(content.content_id, {
          status: ContentStatus.SCHEDULED,
          scheduled_for: scheduledFor,
          published_at: null,
        });
      }

      await logRepo.save(
        logRepo.create({
          project_id: content.project_id,
          user_id: reviewerId,
          action:
            publishMode === PublishMode.IMMEDIATE
              ? "content.published"
              : "content.scheduled",
          entity_type: "content",
          entity_id: content.content_id,
          description:
            publishMode === PublishMode.IMMEDIATE
              ? `Approved and published "${content.title}"`
              : `Approved "${content.title}" — scheduled for ${scheduledFor!.toISOString()}`,
        })
      );

      await notifRepo.save(
        notifRepo.create({
          user_id: approval.submitted_by,
          type: "approval.approved",
          title: "Your content was approved",
          message:
            publishMode === PublishMode.IMMEDIATE
              ? `"${content.title}" has been published.`
              : `"${content.title}" will be published on ${scheduledFor!.toISOString()}.`,
        })
      );

      return saved;
    });
  }

  async reject(
    approvalId: string,
    reviewerId: string,
    dto: RejectDto
  ): Promise<Approval> {
    const approval = await this.findOne(approvalId);
    if (!approval) throw new HttpError(404, "Approval not found");
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new HttpError(409, `Approval already ${approval.status}`);
    }
    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new HttpError(
        400,
        "A reason (at least 5 characters) is required for rejection"
      );
    }

    return AppDataSource.transaction(async (mgr) => {
      const approvalRepo = mgr.getRepository(Approval);
      const contentRepo = mgr.getRepository(Content);
      const logRepo = mgr.getRepository(ActivityLog);
      const notifRepo = mgr.getRepository(Notification);

      const now = new Date();
      const reason = dto.reason.trim();

      approval.reviewer_id = reviewerId;
      approval.status = ApprovalStatus.REJECTED;
      approval.reason = reason;
      approval.decided_at = now;
      const saved = await approvalRepo.save(approval);

      const content = await contentRepo.findOne({
        where: { content_id: approval.content_id },
      });
      if (!content) throw new HttpError(404, "Content not found");

      await contentRepo.update(content.content_id, {
        status: ContentStatus.DRAFT,
        published_at: null,
        scheduled_for: null,
      });

      await logRepo.save(
        logRepo.create({
          project_id: content.project_id,
          user_id: reviewerId,
          action: "approval.rejected",
          entity_type: "approval",
          entity_id: approval.approval_id,
          description: `Rejected "${content.title}": ${reason}`,
        })
      );

      await notifRepo.save(
        notifRepo.create({
          user_id: approval.submitted_by,
          type: "approval.rejected",
          title: "Your content was rejected",
          message: `"${content.title}" was returned to draft. Reason: ${reason}`,
        })
      );

      return saved;
    });
  }

  async cancel(approvalId: string, userId: string): Promise<Approval> {
    const approval = await this.findOne(approvalId);
    if (!approval) throw new HttpError(404, "Approval not found");
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new HttpError(409, `Cannot cancel a ${approval.status} approval`);
    }
    if (approval.submitted_by !== userId) {
      throw new HttpError(403, "Only the submitter can cancel this request");
    }

    return AppDataSource.transaction(async (mgr) => {
      const approvalRepo = mgr.getRepository(Approval);
      const contentRepo = mgr.getRepository(Content);
      const logRepo = mgr.getRepository(ActivityLog);

      approval.status = ApprovalStatus.CANCELLED;
      approval.decided_at = new Date();
      const saved = await approvalRepo.save(approval);

      const content = await contentRepo.findOne({
        where: { content_id: approval.content_id },
      });
      if (content) {
        await contentRepo.update(content.content_id, {
          status: ContentStatus.DRAFT,
        });
        await logRepo.save(
          logRepo.create({
            project_id: content.project_id,
            user_id: userId,
            action: "approval.cancelled",
            entity_type: "approval",
            entity_id: approval.approval_id,
            description: `Withdrew submission of "${content.title}"`,
          })
        );
      }

      return saved;
    });
  }

  async listPending(
    userRoleName: string,
    userId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<Approval>> {
    const limit = Math.min(Math.max(pagination.limit ?? 20, 1), 100);
    const offset = Math.max(pagination.offset ?? 0, 0);

    const qb = this.repo()
      .createQueryBuilder("a")
      .innerJoin(Content, "c", "c.content_id = a.content_id")
      .where("a.status = :s", { s: ApprovalStatus.PENDING });

    if (userRoleName === "Manager") {
      qb.innerJoin(
        "project_members",
        "pm",
        "pm.project_id = c.project_id AND pm.user_id = :uid",
        { uid: userId }
      );
    }

    qb.orderBy("a.submitted_at", "ASC").skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit, offset, count: items.length };
  }

  async listForContent(contentId: string): Promise<Approval[]> {
    return this.repo().find({
      where: { content_id: contentId },
      order: { submitted_at: "DESC" },
    });
  }

  async publishDue(): Promise<number> {
    return AppDataSource.transaction(async (mgr) => {
      const contentRepo = mgr.getRepository(Content);
      const approvalRepo = mgr.getRepository(Approval);
      const logRepo = mgr.getRepository(ActivityLog);

      const due = await contentRepo
        .createQueryBuilder("c")
        .setLock("pessimistic_write")
        .where("c.status = :s", { s: ContentStatus.SCHEDULED })
        .andWhere("c.scheduled_for <= :now", { now: new Date() })
        .getMany();

      const now = new Date();
      for (const content of due) {
        await contentRepo.update(content.content_id, {
          status: ContentStatus.PUBLISHED,
          published_at: now,
        });

        const approval = await approvalRepo.findOne({
          where: {
            content_id: content.content_id,
            status: ApprovalStatus.APPROVED,
          },
          order: { decided_at: "DESC" },
        });
        if (approval) {
          approval.published_at = now;
          await approvalRepo.save(approval);
        }

        await logRepo.save(
          logRepo.create({
            project_id: content.project_id,
            user_id: approval?.reviewer_id ?? approval?.submitted_by ?? "system",
            action: "content.published",
            entity_type: "content",
            entity_id: content.content_id,
            description: `Scheduled publish fired for "${content.title}"`,
          })
        );
      }

      return due.length;
    });
  }
}

export const approvalsService = new ApprovalsService();