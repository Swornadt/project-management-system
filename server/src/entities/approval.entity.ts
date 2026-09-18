import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Content } from "./content.entity";
import { User } from "./user.entity";

@Entity("approvals")
export class Approval {
  @PrimaryGeneratedColumn("uuid")
  approval_id!: string;

  @Column({ type: "uuid" })
  content_id!: string;

  @Column({ type: "uuid" })
  reviewer_id!: string;

  @Column({ type: "varchar", length: 20 })
  status!: string;

  @Column({ type: "text", nullable: true })
  reason?: string | null;

  @Column({ type: "timestamp", nullable: true })
  decided_at?: Date | null;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @ManyToOne(() => Content, { onDelete: "CASCADE" })
  @JoinColumn({ name: "content_id" })
  content!: Content;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "reviewer_id" })
  reviewer!: User;
}