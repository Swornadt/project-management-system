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
import { Role } from "./role.entity";
import { Project } from "./project.entity";
import { ProjectMember } from "./project-member.entity";
import { Content } from "./content.entity";
import { Task } from "./task.entity";
import { TaskComment } from "./task-comment.entity";
import { File } from "./file.entity";
import { Notification } from "./notification.entity";
import { ActivityLog } from "./activity-log.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  user_id!: string;

  @Column({ type: "uuid" })
  role_id!: string;

  @Column({ type: "varchar", length: 50 })
  first_name!: string;

  @Column({ type: "varchar", length: 50 })
  last_name!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255 })
  password_hash!: string;

  @Column({ type: "varchar", length: 20, default: "active" })
  status!: string;

  @Column({ type: "int", default: 0 })
  failed_login_count!: number;

  @Column({ type: "timestamp", nullable: true })
  locked_until?: Date;

  @Column({ type: "boolean", default: false })
  email_verified!: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  verification_token?: string;

  @Column({ type: "timestamp", nullable: true })
  verification_token_expires?: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  password_reset_token?: string;

  @Column({ type: "timestamp", nullable: true })
  password_reset_expires?: Date;

  @Column({ type: "timestamp", nullable: true })
  deleted_at?: Date;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: "role_id" })
  role!: Role;

  @OneToMany(() => Project, (project) => project.owner)
  owned_projects!: Project[];

  @OneToMany(() => ProjectMember, (pm) => pm.user)
  project_memberships!: ProjectMember[];

  @OneToMany(() => Content, (content) => content.author)
  contents!: Content[];

  @OneToMany(() => Task, (task) => task.assignee)
  assigned_tasks!: Task[];

  @OneToMany(() => Task, (task) => task.creator)
  created_tasks!: Task[];

  @OneToMany(() => TaskComment, (tc) => tc.user)
  task_comments!: TaskComment[];

  @OneToMany(() => File, (file) => file.uploader)
  uploaded_files!: File[];

  @OneToMany(() => Notification, (n) => n.user)
  notifications!: Notification[];

  @OneToMany(() => ActivityLog, (al) => al.user)
  activity_logs!: ActivityLog[];
}
