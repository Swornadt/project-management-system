import type { Response } from "express";

import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
  addProjectMemberSchema,
  projectIdParamSchema,
  projectMemberParamsSchema,
} from "./project.dto";

import { projectService } from "./project.service";

import type { AuthRequest } from "../../shared/middleware/auth.middleware";
import { HttpError } from "../../shared/middleware/error.middleware";

function getAuthenticatedUser(req: AuthRequest) {
  if (!req.user?.userId || !req.user?.roleName) {
    throw new HttpError(401, "Authentication required");
  }

  return {
    userId: req.user.userId,
    roleName: req.user.roleName,
  };
}

export const createProject = async (
  req: AuthRequest,
  res: Response
) => {
  const { userId, roleName } = getAuthenticatedUser(req);

  const data = createProjectSchema.parse(req.body);

  const project = await projectService.createProject(
    data,
    userId,
    roleName
  );

  return res.status(201).json({
    success: true,
    statusCode: 201,
    data: project,
  });
};

export const getProjects = async (
  req: AuthRequest,
  res: Response
) => {
  const { userId, roleName } = getAuthenticatedUser(req);

  const query = projectQuerySchema.parse(req.query);

  const projects = await projectService.getProjects(
    query,
    userId,
    roleName
  );

  return res.status(200).json({
    success: true,
    statusCode: 200,
    data: projects,
  });
};

export const getProject = async (
  req: AuthRequest,
  res: Response
) => {
  const { userId, roleName } = getAuthenticatedUser(req);

  const { projectId } = projectIdParamSchema.parse(req.params);

  const project = await projectService.getProject(
    projectId,
    userId,
    roleName
  );

  return res.status(200).json({
    success: true,
    statusCode: 200,
    data: project,
  });
};

export const updateProject = async (
  req: AuthRequest,
  res: Response
) => {
  const { userId, roleName } = getAuthenticatedUser(req);

  const { projectId } = projectIdParamSchema.parse(req.params);

  const data = updateProjectSchema.parse(req.body);

  const project = await projectService.updateProject(
    projectId,
    data,
    userId,
    roleName
  );

  return res.status(200).json({
    success: true,
    statusCode: 200,
    data: project,
  });
};

export const archiveProject = async (
  req: AuthRequest,
  res: Response
) => {
  const { userId, roleName } = getAuthenticatedUser(req);

  const { projectId } = projectIdParamSchema.parse(req.params);

  const project = await projectService.archiveProject(
    projectId,
    userId,
    roleName
  );

  return res.status(200).json({
    success: true,
    statusCode: 200,
    data: project,
  });
};

export const addProjectMember = async (
  req: AuthRequest,
  res: Response
) => {
  const { userId, roleName } = getAuthenticatedUser(req);

  const { projectId } = projectIdParamSchema.parse(req.params);

  const data = addProjectMemberSchema.parse(req.body);

  const member = await projectService.addProjectMember(
    projectId,
    data,
    userId,
    roleName
  );

  return res.status(201).json({
    success: true,
    statusCode: 201,
    data: member,
  });
};

export const removeProjectMember = async (
  req: AuthRequest,
  res: Response
) => {
  const { userId, roleName } = getAuthenticatedUser(req);

  const { projectId, userId: memberUserId } =
    projectMemberParamsSchema.parse(req.params);

  const result = await projectService.removeProjectMember(
    projectId,
    memberUserId,
    userId,
    roleName
  );

  return res.status(200).json({
    success: true,
    statusCode: 200,
    data: result,
  });
};

export const getProjectDashboard = async (
  req: AuthRequest,
  res: Response
) => {
  const { userId, roleName } = getAuthenticatedUser(req);

  const { projectId } = projectIdParamSchema.parse(req.params);

  const dashboard = await projectService.getProjectDashboard(
    projectId,
    userId,
    roleName
  );

  return res.status(200).json({
    success: true,
    statusCode: 200,
    data: dashboard,
  });
};