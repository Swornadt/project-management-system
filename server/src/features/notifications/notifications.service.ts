import { getRepo } from "../../shared/db/repositories";
import { Notification } from "../../entities/notification.entity";
import { HttpError } from "../../shared/middleware/error.middleware";
import type { NotificationQueryDto } from "./notifications.dto";
import type { PaginatedResponse } from "../../shared/types";

// Notifications are created as a side effect of other features (content
// approvals, task assignment/status changes/comments.
export class NotificationsService {
  private repo() {
    return getRepo(Notification);
  }

  async listForUser(
    userId: string,
    filters: NotificationQueryDto = {}
  ): Promise<PaginatedResponse<Notification>> {
    const qb = this.repo()
      .createQueryBuilder("notification")
      .where("notification.user_id = :userId", { userId });

    if (filters.is_read !== undefined) {
      qb.andWhere("notification.is_read = :isRead", { isRead: filters.is_read });
    }
    if (filters.type) {
      qb.andWhere("notification.type = :type", { type: filters.type });
    }

    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
    const offset = Math.max(filters.offset ?? 0, 0);

    qb.orderBy("notification.is_read", "ASC")
      .addOrderBy("notification.created_at", "DESC")
      .skip(offset)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit, offset, count: items.length };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo().count({ where: { user_id: userId, is_read: false } as any });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.repo().findOne({ where: { notification_id: id } as any });
    if (!notification) throw new HttpError(404, "Notification not found");
    if (notification.user_id !== userId) {
      throw new HttpError(403, "You can only manage your own notifications");
    }
    if (notification.is_read) return notification;

    const merged = this.repo().merge(notification, { is_read: true });
    return this.repo().save(merged);
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.repo()
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: true })
      .where("user_id = :userId AND is_read = false", { userId })
      .execute();
    return { updated: result.affected ?? 0 };
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const notification = await this.repo().findOne({ where: { notification_id: id } as any });
    if (!notification) return false;
    if (notification.user_id !== userId) {
      throw new HttpError(403, "You can only manage your own notifications");
    }
    const result = await this.repo().delete({ notification_id: id } as any);
    return (result.affected ?? 0) > 0;
  }
}

export const notificationsService = new NotificationsService();
