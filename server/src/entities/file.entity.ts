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
import { ProjectFile } from "./project-file.entity";

@Entity("files")
export class File {
  @PrimaryGeneratedColumn("uuid")
  file_id!: string;

  @Column({ type: "varchar", length: 255 })
  original_name!: string;

  @Column({ type: "varchar", length: 255 })
  storage_key!: string;

  @Column({ type: "varchar", length: 100 })
  mime_type!: string;

  @Column({ type: "bigint" })
  size_bytes!: number;

  @Column({ type: "varchar", length: 128, nullable: true })
  checksum?: string;

  @Column({ type: "uuid" })
  uploaded_by!: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @ManyToOne(() => User, (user) => user.uploaded_files, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "uploaded_by" })
  uploader!: User;

  @OneToMany(() => ProjectFile, (pf) => pf.file)
  project_files!: ProjectFile[];
}
