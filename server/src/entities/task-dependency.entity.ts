import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Task } from "./task.entity";

@Entity("task_dependencies")
export class TaskDependency {
  @Column({ type: "uuid", primary: true })
  task_id!: string;

  @Column({ type: "uuid", primary: true })
  depends_on_task_id!: string;

  @Column({ type: "varchar", length: 20, default: "finish_to_start" })
  dependency_type!: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @ManyToOne(() => Task, (task) => task.dependencies, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "task_id" })
  task!: Task;

  @ManyToOne(() => Task, (task) => task.dependent_tasks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "depends_on_task_id" })
  depends_on_task!: Task;
}
