import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";

import { User } from "./user.entity";
import { ProjectMember } from "./project-member.entity";
import { Task } from "./task.entity";
import { Content } from "./content.entity";
import { ProjectFile } from "./project-file.entity";
import { ActivityLog } from "./activity-log.entity";

@Entity("projects")
export class Project {
  @PrimaryGeneratedColumn("uuid", { name: "project_id" })
  project_id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  key_code!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "uuid", name: "owner_id" })
  owner_id!: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: "owner_id" })
  owner!: User;

  @Column({ type: "varchar", length: 50, default: "Planned" })
  status!: string;

  @Column({ type: "varchar", length: 50, default: "Medium" })
  priority!: string;

  @Column({ type: "date", nullable: true, name: "start_date" })
  start_date!: Date | null;

  @Column({ type: "date", nullable: true, name: "due_date" })
  due_date!: Date | null;

  @Column({ type: "timestamp", nullable: true, name: "archived_at" })
  archived_at!: Date | null;

  @OneToMany(() => ProjectMember, (pm) => pm.project)
  members!: ProjectMember[];

  @OneToMany(() => Task, (task) => task.project)
  tasks!: Task[];

  @OneToMany(() => Content, (content) => content.project)
  contents!: Content[];

  @OneToMany(() => ProjectFile, (pf) => pf.project)
  project_files!: ProjectFile[];

  @OneToMany(() => ActivityLog, (log) => log.project)
  activity_logs!: ActivityLog[];

  @CreateDateColumn({ name: "created_at" })
  created_at!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at!: Date;
}