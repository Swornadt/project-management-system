import { z } from "zod";

export const fileIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid(),
});

export const fileQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z
    .string()
    .trim()
    .min(1)
    .optional(),
});
export type FileIdParam = z.infer<typeof fileIdParamSchema>;
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
export type FileQuery = z.infer<typeof fileQuerySchema>;