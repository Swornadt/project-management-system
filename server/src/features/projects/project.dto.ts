import { z } from "zod";

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid(),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(3).max(100),

  key_code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Key/code can only contain letters, numbers, hyphens and underscores"
    ),

  description: z.string().trim().min(1).max(2000).optional(),

  owner_id: z.string().uuid().optional(),

  status: z
    .enum(["Planned", "Active", "On Hold", "Completed", "Archived"])
    .optional(),

  priority: z
    .enum(["Low", "Medium", "High", "Critical"])
    .optional(),

  start_date: z.coerce.date().optional(),

  due_date: z.coerce.date().optional(),
});

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine(
    (data) => {
      if (data.start_date && data.due_date) {
        return data.due_date >= data.start_date;
      }

      return true;
    },
    {
      message: "Due date cannot be before start date",
      path: ["due_date"],
    }
  );

export const projectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  per_page: z.coerce.number().int().min(1).max(100).default(25),

  q: z.string().trim().optional(),

  status: z.string().optional(),

  owner_id: z.string().uuid().optional(),

  member_id: z.string().uuid().optional(),

  priority: z.string().optional(),

  start_from: z.coerce.date().optional(),

  start_to: z.coerce.date().optional(),

  end_from: z.coerce.date().optional(),

  end_to: z.coerce.date().optional(),

  include_archived: z
    .enum(["true", "false"])
    .default("false"),

  sort: z.string().default("-created_at"),
});

export const addProjectMemberSchema = z.object({
  user_id: z.string().uuid(),

  role: z
    .enum(["manager", "member"])
    .default("member"),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type ProjectQueryDto = z.infer<typeof projectQuerySchema>;
export type AddProjectMemberDto = z.infer<
  typeof addProjectMemberSchema
>;