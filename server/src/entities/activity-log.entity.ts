import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
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

  @ManyToOne(() => User, {
    onDelete: "SET NULL",
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "user_id" })
  user?: User | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  actor_email?: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  actor_role?: string | null;

  @Column({ type: "uuid", nullable: true })
  project_id?: string | null;

  @ManyToOne(() => Project, {
    onDelete: "SET NULL",
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "project_id" })
  project?: Project | null;

  @Column({ type: "varchar", length: 50 })
  entity_type!: string;

  @Column({ type: "uuid", nullable: true })
  entity_id?: string | null;

  @Column({ type: "varchar", length: 100, default: "UPDATE" })
  action!: string;

  @Column({
    type: "enum",
    enum: AuditSeverity,
    default: AuditSeverity.INFO,
  })
  severity!: AuditSeverity;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "jsonb", nullable: true })
  before_data?: Record<string, any> | null;

  @Column({ type: "jsonb", nullable: true })
  after_data?: Record<string, any> | null;

  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  metadata!: Record<string, any>;

  @Column({ type: "inet", nullable: true })
  ip_address?: string | null;

  @Column({ type: "text", nullable: true })
  user_agent?: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}