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
import { User } from "./user.entity";
import { ProjectMember } from "./project-member.entity";
import { Content } from "./content.entity";
import { Task } from "./task.entity";
import { ProjectFile } from "./project-file.entity";
import { ActivityLog } from "./activity-log.entity";

@Entity("projects")
export class Project {
  @PrimaryGeneratedColumn("uuid")
  project_id!: string;

  @Column({ type: "uuid" })
  owner_id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "varchar", length: 20, default: "active" })
  status!: string;

  @Column({ type: "date", nullable: true })
  start_date?: Date;

  @Column({ type: "date", nullable: true })
  due_date?: Date;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @ManyToOne(() => User, (user) => user.owned_projects)
  @JoinColumn({ name: "owner_id" })
  owner!: User;

  @OneToMany(() => ProjectMember, (pm) => pm.project)
  members!: ProjectMember[];

  @OneToMany(() => Content, (content) => content.project)
  contents!: Content[];

  @OneToMany(() => Task, (task) => task.project)
  tasks!: Task[];

  @OneToMany(() => ProjectFile, (pf) => pf.project)
  project_files!: ProjectFile[];

  @OneToMany(() => ActivityLog, (al) => al.project)
  activity_logs!: ActivityLog[];
}
