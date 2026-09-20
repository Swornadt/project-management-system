import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100),
  key: z.string().trim().min(1, "Project key is required").max(20),
  description: z.string().trim().max(1000).optional(),

  owner_id: z.string().uuid("Owner ID must be a valid UUID").optional(),

  status: z
    .enum(["planned", "active", "on_hold", "completed", "archived"])
    .default("planned"),

  priority: z.string().trim().min(1).max(20).default("medium"),

  start_date: z.string().date().optional(),
  due_date: z.string().date().optional(),

  member_ids: z.array(z.string().uuid()).optional(),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema
  .partial()
  .omit({ member_ids: true });

export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;

export const projectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z
    .enum(["planned", "active", "on_hold", "completed", "archived"])
    .optional(),
  priority: z.string().trim().optional(),
  owner_id: z.string().uuid().optional(),
  member_id: z.string().uuid().optional(),
  start_date_from: z.string().date().optional(),
  start_date_to: z.string().date().optional(),
  due_date_from: z.string().date().optional(),
  due_date_to: z.string().date().optional(),
});

export type ProjectQueryDto = z.infer<typeof projectQuerySchema>;

export const addProjectMemberSchema = z.object({
  user_id: z.string().uuid("User ID must be a valid UUID"),
  role: z.enum(["admin", "manager", "member", "viewer"]),
});

export type AddProjectMemberDto = z.infer<typeof addProjectMemberSchema>;