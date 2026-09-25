import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Project } from "./project.entity";
import { User } from "./user.entity";
import { TaskComment } from "./task-comment.entity";
import { TaskDependency } from "./task-dependency.entity";

@Entity("tasks")
export class Task {
  @PrimaryGeneratedColumn("uuid")
  task_id!: string;

  @Column({ type: "uuid" })
  project_id!: string;

  @Column({ type: "uuid", nullable: true })
  assignee_id?: string;

  @Column({ type: "uuid" })
  created_by!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "varchar", length: 20, default: "todo" })
  status!: string;

  @Column({ type: "varchar", length: 20, default: "medium" })
  priority!: string;

  @Column({ type: "date", nullable: true })
  due_date?: Date;

  @Column({ type: "numeric", precision: 6, scale: 2, nullable: true })
  estimate_hours?: number;

  @Column({ type: "text", array: true, default: () => "'{}'" })
  labels!: string[];

  @Column({ type: "uuid", nullable: true })
  parent_task_id?: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @ManyToOne(() => Project, (project) => project.tasks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @ManyToOne(() => Task, (task) => task.subtasks, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({ name: "parent_task_id" })
  parent_task?: Task;

  @OneToMany(() => Task, (task) => task.parent_task)
  subtasks!: Task[];

  @ManyToOne(() => User, (user) => user.assigned_tasks, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "assignee_id" })
  assignee?: User;

  @ManyToOne(() => User, (user) => user.created_tasks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "created_by" })
  creator!: User;

  @OneToMany(() => TaskComment, (tc) => tc.task)
  comments!: TaskComment[];

  @OneToMany(() => TaskDependency, (td) => td.task)
  dependencies!: TaskDependency[];

  @OneToMany(() => TaskDependency, (td) => td.depends_on_task)
  dependent_tasks!: TaskDependency[];
}
