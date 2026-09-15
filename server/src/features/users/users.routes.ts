import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/error.middleware";
import {
  createUser,
  findAllUsers,
  findOneUser,
  removeUser,
  updateUser,
} from "./users.controller";

export const usersRouter = Router();

usersRouter.get("/", asyncHandler(findAllUsers));
usersRouter.get("/:id", asyncHandler(findOneUser as any));
usersRouter.post("/", asyncHandler(createUser));
usersRouter.patch("/:id", asyncHandler(updateUser as any));
usersRouter.delete("/:id", asyncHandler(removeUser as any));
