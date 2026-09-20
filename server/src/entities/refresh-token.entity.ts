import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("refresh_tokens")
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "varchar", length: 255 })
  token_hash!: string;

  @Column({ type: "timestamp" })
  expires_at!: Date;

  @Column({ type: "timestamp", nullable: true })
  revoked_at?: Date;

  @Column({ type: "uuid", nullable: true })
  replaced_by_id?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  ip_address?: string;

  @Column({ type: "text", nullable: true })
  user_agent?: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => RefreshToken, { nullable: true })
  @JoinColumn({ name: "replaced_by_id" })
  replaced_by?: RefreshToken;
}
