import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Content } from "./content.entity";
import { File } from "./file.entity";

@Entity("content_files")
export class ContentFile {
  @Column({ type: "uuid", primary: true })
  content_id!: string;

  @Column({ type: "uuid", primary: true })
  file_id!: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @ManyToOne(() => Content, { onDelete: "CASCADE" })
  @JoinColumn({ name: "content_id" })
  content!: Content;

  @ManyToOne(() => File, { onDelete: "CASCADE" })
  @JoinColumn({ name: "file_id" })
  file!: File;
}