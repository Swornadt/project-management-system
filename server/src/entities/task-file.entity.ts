import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Task } from "./task.entity";
import { File } from "./file.entity";

@Entity("task_files")
export class TaskFile {
  @Column({ type: "uuid", primary: true })
  task_id!: string;

  @Column({ type: "uuid", primary: true })
  file_id!: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @ManyToOne(() => Task, { onDelete: "CASCADE" })
  @JoinColumn({ name: "task_id" })
  task!: Task;

  @ManyToOne(() => File, { onDelete: "CASCADE" })
  @JoinColumn({ name: "file_id" })
  file!: File;
}