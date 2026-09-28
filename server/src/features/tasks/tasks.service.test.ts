// server/src/features/tasks/tasks.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../shared/middleware/error.middleware";
import { TaskService } from "./tasks.service";
import { Task } from "../../entities/task.entity";
import { Notification } from "../../entities/notification.entity";
import { ActivityLog } from "../../entities/activity-log.entity";
import type { Task as TaskType } from "../../entities/task.entity";

const mockTaskRepo = {
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn((data: any) => data),
  save: vi.fn(async (entity: any) => entity),
  merge: vi.fn((target: any, source: any) => Object.assign(target, source)),
  update: vi.fn(async () => ({ affected: 1 })),
};

const mockNotificationRepo = {
  create: vi.fn((data: any) => data),
  save: vi.fn(async (entity: any) => entity),
};

const mockActivityLogRepo = {
  create: vi.fn((data: any) => data),
  save: vi.fn(async (entity: any) => entity),
};

vi.mock("../../shared/db/repositories", () => ({
  getRepo: (entity: unknown) => {
    if (entity === Notification) return mockNotificationRepo;
    if (entity === ActivityLog) return mockActivityLogRepo;
    return mockTaskRepo;
  },
}));

function makeTask(overrides: Partial<TaskType> = {}): TaskType {
  return {
    task_id: "task-1",
    project_id: "project-1",
    assignee_id: "assignee-1",
    created_by: "creator-1",
    title: "Test task",
    description: "...",
    status: "todo",
    priority: "medium",
    labels: [],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as TaskType;
}

describe("TaskService", () => {
  let service: TaskService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTaskRepo.create.mockImplementation((data: any) => data);
    mockTaskRepo.save.mockImplementation(async (entity: any) => entity);
    mockTaskRepo.merge.mockImplementation((target: any, source: any) => Object.assign(target, source));
    mockTaskRepo.update.mockImplementation(async () => ({ affected: 1 }));
    mockNotificationRepo.create.mockImplementation((data: any) => data);
    mockNotificationRepo.save.mockImplementation(async (entity: any) => entity);
    mockActivityLogRepo.create.mockImplementation((data: any) => data);
    mockActivityLogRepo.save.mockImplementation(async (entity: any) => entity);
    service = new TaskService();
  });

  describe("updateStatus", () => {
    it("throws 400 for an unrecognized status", async () => {
      await expect(
        service.updateStatus("task-1", "not_a_status", "creator-1", "Admin")
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 404 if the task does not exist", async () => {
      mockTaskRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus("missing", "in_progress", "creator-1", "Admin")
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 403 if a non-privileged user is not the assignee", async () => {
      mockTaskRepo.findOne.mockResolvedValue(makeTask({ assignee_id: "assignee-1" }));
      await expect(
        service.updateStatus("task-1", "in_progress", "someone-else", "Employee")
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("allows the assignee (an Employee) to update their own task", async () => {
      mockTaskRepo.findOne.mockResolvedValue(makeTask({ status: "todo", assignee_id: "assignee-1" }));
      const result = await service.updateStatus("task-1", "in_progress", "assignee-1", "Employee");
      expect(result.status).toBe("in_progress");
    });

    it("throws 409 on a disallowed transition", async () => {
      mockTaskRepo.findOne.mockResolvedValue(makeTask({ status: "cancelled" }));
      await expect(
        service.updateStatus("task-1", "done", "creator-1", "Admin")
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("allows a Manager to move any task and logs the activity", async () => {
      mockTaskRepo.findOne.mockResolvedValue(makeTask({ status: "todo" }));
      const result = await service.updateStatus("task-1", "in_progress", "manager-1", "Manager");
      expect(result.status).toBe("in_progress");
      expect(mockActivityLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ action: "task.status_changed" })
      );
    });

    it("notifies the task creator when someone else changes the status", async () => {
      mockTaskRepo.findOne.mockResolvedValue(
        makeTask({ status: "todo", created_by: "creator-1" })
      );
      await service.updateStatus("task-1", "in_progress", "manager-1", "Manager");
      expect(mockNotificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "creator-1", type: "task_status_changed" })
      );
    });
  });

  describe("assign", () => {
    it("throws 404 if the task does not exist", async () => {
      mockTaskRepo.findOne.mockResolvedValue(null);
      await expect(service.assign("missing", "user-2", "manager-1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("assigns the task and notifies the new assignee", async () => {
      mockTaskRepo.findOne
        .mockResolvedValueOnce(makeTask({ assignee_id: undefined }))
        .mockResolvedValueOnce(makeTask({ assignee_id: "user-2" }));

      const result = await service.assign("task-1", "user-2", "manager-1");

      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        { task_id: "task-1" },
        { assignee_id: "user-2" }
      );
      expect(result.assignee_id).toBe("user-2");
      expect(mockNotificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "user-2", type: "task_assigned" })
      );
    });

    it("unassigns the task when assigneeId is null and skips the notification", async () => {
      mockTaskRepo.findOne
        .mockResolvedValueOnce(makeTask({ assignee_id: "assignee-1" }))
        .mockResolvedValueOnce(makeTask({ assignee_id: undefined }));

      await service.assign("task-1", null, "manager-1");

      expect(mockTaskRepo.update).toHaveBeenCalledWith({ task_id: "task-1" }, { assignee_id: null });
      expect(mockNotificationRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("throws 400 for an invalid status", async () => {
      await expect(
        service.create({
          project_id: "project-1",
          created_by: "creator-1",
          title: "New task",
          status: "not_a_status",
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 400 for an invalid priority", async () => {
      await expect(
        service.create({
          project_id: "project-1",
          created_by: "creator-1",
          title: "New task",
          priority: "extreme",
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 400 when the parent task belongs to a different project", async () => {
      mockTaskRepo.findOne.mockResolvedValue(makeTask({ project_id: "other-project" }));
      await expect(
        service.create({
          project_id: "project-1",
          created_by: "creator-1",
          title: "Subtask",
          parent_task_id: "task-parent",
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("creates the task and notifies the assignee when one is set", async () => {
      const created = await service.create({
        project_id: "project-1",
        created_by: "creator-1",
        title: "New task",
        assignee_id: "assignee-1",
      });

      expect(created.title).toBe("New task");
      expect(mockNotificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "assignee-1", type: "task_assigned" })
      );
      expect(mockActivityLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ action: "task.created" })
      );
    });
  });
});
