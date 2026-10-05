import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Content } from "./content.entity";
import { User } from "./user.entity";

export enum ContentStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  SCHEDULED = "scheduled",
  PUBLISHED = "published",
}

export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export enum PublishMode {
  IMMEDIATE = "immediate",
  SCHEDULED = "scheduled",
}

@Entity("approvals")
@Index(["content_id", "status"])
export class Approval {
  @PrimaryGeneratedColumn("uuid")
  approval_id!: string;

  @Column({ type: "uuid" })
  content_id!: string;

  @Column({ type: "uuid" })
  submitted_by!: string;

  @CreateDateColumn({ type: "timestamp" })
  submitted_at!: Date;

  @Column({ type: "uuid", nullable: true })
  reviewer_id?: string | null;

  @Column({ type: "varchar", length: 20, default: ApprovalStatus.PENDING })
  status!: ApprovalStatus;

  @Column({ type: "text", nullable: true })
  reason?: string | null;

  @Column({ type: "timestamp", nullable: true })
  decided_at?: Date | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  publish_mode?: PublishMode | null;

  @Column({ type: "timestamp", nullable: true })
  scheduled_for?: Date | null;

  @Column({ type: "timestamp", nullable: true })
  published_at?: Date | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @ManyToOne(() => Content, { onDelete: "CASCADE" })
  @JoinColumn({ name: "content_id" })
  content!: Content;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "submitted_by" })
  submitter!: User;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "reviewer_id" })
  reviewer?: User | null;
}