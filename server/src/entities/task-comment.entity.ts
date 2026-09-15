import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Task } from "./task.entity";
import { User } from "./user.entity";

@Entity("task_comments")
export class TaskComment {
  @PrimaryGeneratedColumn("uuid")
  comment_id!: string;

  @Column({ type: "uuid" })
  task_id!: string;

  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "text" })
  comment!: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @ManyToOne(() => Task, (task) => task.comments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "task_id" })
  task!: Task;

  @ManyToOne(() => User, (user) => user.task_comments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
