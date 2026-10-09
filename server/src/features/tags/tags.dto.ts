import { z } from "zod";

export interface TagResponse {
  tag_id: string;
  name: string;
  slug: string;
  created_at: Date;
}

export interface CreateTagDto {
  name: string;
  slug: string;
}

export interface UpdateTagDto {
  name?: string | undefined;
  slug?: string | undefined;
}

export const createTagSchema = z.object({
  name: z.string().trim().min(1, "Field 'name' is required"),
  slug: z.string().trim().min(1, "Field 'slug' is required"),
});

export const updateTagSchema = z.object({
  name: z.string().trim().min(1, "Field 'name' is required").optional(),
  slug: z.string().trim().min(1, "Field 'slug' is required").optional(),
});