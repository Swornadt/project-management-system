import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { Project } from "./project.entity";
import { User } from "./user.entity";

export enum AuditSeverity {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
}

@Entity("activity_logs")
@Index(["project_id"])
@Index(["user_id"])
@Index(["entity_type", "entity_id"])
@Index(["action"])
@Index(["created_at"])
export class ActivityLog {
  @PrimaryGeneratedColumn("uuid")
  activity_id!: string;

  @Column({ type: "uuid", nullable: true })
  user_id?: string | null;

  @Column({ type: "uuid", nullable: true })
  project_id?: string | null;

  @Column({ type: "varchar", length: 50 })
  entity_type!: string;

  @Column({ type: "uuid", nullable: true })
  entity_id?: string | null;

  @Column({ type: "varchar", length: 100, default: "UPDATE" })
  action!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
  
  severity?: string;
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  user?: User | null;
  project?: Project | null;
}
