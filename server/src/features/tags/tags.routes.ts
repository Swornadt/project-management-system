import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/error.middleware";
import { authenticate } from "../../shared/middleware/auth.middleware";
import {
  findAllTags,
  findOneTag,
  createTag,
  updateTag,
  removeTag,
  attachTagToContent,
  detachTagFromContent,
  listTagsForContent,
} from "./tags.controller";

export const tagsRouter = Router();

tagsRouter.use(authenticate);

tagsRouter.get("/", asyncHandler(findAllTags));

// Must be registered before GET "/:id" — Express matches in registration
// order, and "/:id" would otherwise swallow "/contents/:contentId" by
// treating "contents" as the :id value.
tagsRouter.get("/contents/:contentId", asyncHandler(listTagsForContent as any));

tagsRouter.get("/:id", asyncHandler(findOneTag as any));
tagsRouter.post("/", asyncHandler(createTag));
tagsRouter.patch("/:id", asyncHandler(updateTag as any));
tagsRouter.delete("/:id", asyncHandler(removeTag as any));

tagsRouter.post("/:tagId/contents/:contentId", asyncHandler(attachTagToContent as any));
tagsRouter.delete("/:tagId/contents/:contentId", asyncHandler(detachTagFromContent as any));
