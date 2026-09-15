import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Project } from "./project.entity";
import { File } from "./file.entity";

@Entity("project_files")
export class ProjectFile {
  @Column({ type: "uuid", primary: true })
  project_id!: string;

  @Column({ type: "uuid", primary: true })
  file_id!: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @ManyToOne(() => Project, (project) => project.project_files, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @ManyToOne(() => File, (file) => file.project_files, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "file_id" })
  file!: File;
}
