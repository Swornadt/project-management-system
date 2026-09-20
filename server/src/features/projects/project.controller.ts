// project.controller.ts
import { Request, Response } from "express";
import { projectService } from "./project.service";
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
  addProjectMemberSchema,
} from "./project.dto";

export const createProject = async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const data = createProjectSchema.parse(req.body);

  const project = await projectService.createProject(data, userId, role);

  res.status(201).json(project);
};

export const getProjects = async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const query = projectQuerySchema.parse(req.query);

  const result = await projectService.getProjects(query, userId, role);

  res.json(result);
};

export const getProjectById = async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const project = await projectService.getProjectById(
    req.params.id,
    userId,
    role
  );
  res.json(project);
};

export const updateProject = async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const data = updateProjectSchema.parse(req.body);

  const project = await projectService.updateProject(
    req.params.id,
    data,
    userId,
    role
  );
  res.json(project);
};

export const archiveProject = async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const result = await projectService.archiveProject(
    req.params.id,
    userId,
    role
  );
  res.json(result);
};

export const getProjectDashboard = async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const result = await projectService.getProjectDashboard(
    req.params.id,
    userId,
    role
  );
  res.json(result);
};

export const addProjectMember = async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const data = addProjectMemberSchema.parse(req.body);

  const member = await projectService.addProjectMember(
    req.params.id,
    data,
    userId,
    role
  );
  res.status(201).json(member);
};

export const removeProjectMember = async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const result = await projectService.removeProjectMember(
    req.params.id,
    req.params.userId,
    userId,
    role
  );
  res.json(result);
};