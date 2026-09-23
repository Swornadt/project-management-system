import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Project } from "./project.entity";
import { User } from "./user.entity";

@Entity("activity_logs")
export class ActivityLog {
  @PrimaryGeneratedColumn("uuid")
  activity_id!: string;

  @Column({ type: "uuid", nullable: true })
  project_id?: string;

  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "varchar", length: 100 })
  action!: string;

  @Column({ type: "varchar", length: 50 })
  entity_type!: string;

  @Column({ type: "uuid", nullable: true })
  entity_id?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;
  
  @ManyToOne(() => Project, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({ name: "project_id" })
  project?: Project;
  @ManyToOne(() => User, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
