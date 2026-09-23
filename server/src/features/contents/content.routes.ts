// server/src/features/contents/contents.routes.ts
import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/error.middleware";
import {
  findAllContent,
  findOneContent,
  createContent,
  updateContent,
  removeContent,
  submitContentForApproval,
  decideContentApproval,
  publishContent,
} from "./content.controller";
import { authenticate } from "../../shared/middleware/auth.middleware";

export const contentsRouter = Router();

contentsRouter.use(authenticate);

contentsRouter.get("/", asyncHandler(findAllContent));
contentsRouter.get("/:id", asyncHandler(findOneContent as any));
contentsRouter.post("/", asyncHandler(createContent));
contentsRouter.patch("/:id", asyncHandler(updateContent as any));
contentsRouter.delete("/:id", asyncHandler(removeContent as any));

contentsRouter.post("/:id/submit", asyncHandler(submitContentForApproval as any));
contentsRouter.post("/:id/decide", asyncHandler(decideContentApproval as any));
contentsRouter.post("/:id/publish", asyncHandler(publishContent as any));