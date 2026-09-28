import { getRepo } from "../../shared/db/repositories";
import { Task } from "../../entities/task.entity";
import { TaskDependency } from "../../entities/task-dependency.entity";
import { HttpError } from "../../shared/middleware/error.middleware";
import type { CreateTaskDependencyDto } from "./task-dependencies.dto";

export class TaskDependencyService {
  private repo() {
    return getRepo(TaskDependency);
  }

  async listForTask(taskId: string): Promise<{
    depends_on: TaskDependency[];
    blocks: TaskDependency[];
  }> {
    const [depends_on, blocks] = await Promise.all([
      this.repo().find({ where: { task_id: taskId } as any }),
      this.repo().find({ where: { depends_on_task_id: taskId } as any }),
    ]);
    return { depends_on, blocks };
  }

  async create(payload: CreateTaskDependencyDto): Promise<TaskDependency> {
    const { task_id, depends_on_task_id } = payload;

    if (task_id === depends_on_task_id) {
      throw new HttpError(400, "A task cannot depend on itself");
    }

    const taskRepo = getRepo(Task);
    const [task, dependsOnTask] = await Promise.all([
      taskRepo.findOne({ where: { task_id } as any }),
      taskRepo.findOne({ where: { task_id: depends_on_task_id } as any }),
    ]);
    if (!task) throw new HttpError(404, "Task not found");
    if (!dependsOnTask) throw new HttpError(404, "Dependency target task not found");

    // Prevent creating a cycle: if depends_on_task_id can already (directly
    // or transitively) reach task_id, adding this edge would close a loop.
    if (await this.wouldCreateCycle(task_id, depends_on_task_id)) {
      throw new HttpError(409, "This dependency would create a circular reference between tasks");
    }

    const dependency = this.repo().create({
      task_id,
      depends_on_task_id,
      dependency_type: payload.dependency_type ?? "finish_to_start",
    });
    return this.repo().save(dependency);
  }

  async remove(taskId: string, dependsOnTaskId: string): Promise<boolean> {
    const result = await this.repo().delete({
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
    } as any);
    return (result.affected ?? 0) > 0;
  }

  /** Breadth-first search: can `startTaskId` reach `targetTaskId` via existing "depends on" edges? */
  private async wouldCreateCycle(targetTaskId: string, startTaskId: string): Promise<boolean> {
    const visited = new Set<string>([startTaskId]);
    const queue: string[] = [startTaskId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === targetTaskId) return true;

      const edges = await this.repo().find({ where: { task_id: current } as any });
      for (const edge of edges) {
        if (!visited.has(edge.depends_on_task_id)) {
          visited.add(edge.depends_on_task_id);
          queue.push(edge.depends_on_task_id);
        }
      }
    }
    return false;
  }
}

export const taskDependencyService = new TaskDependencyService();
