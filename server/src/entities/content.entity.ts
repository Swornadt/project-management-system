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
import { Project } from "./project.entity";
import { User } from "./user.entity";
import { ContentTag } from "./content-tag.entity";

@Entity("contents")
export class Content {
  @PrimaryGeneratedColumn("uuid")
  content_id!: string;

  @Column({ type: "uuid" })
  project_id!: string;

  @Column({ type: "uuid" })
  author_id!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  slug!: string;

  @Column({ type: "text", nullable: true })
  body?: string;

  @Column({ type: "varchar", length: 20, default: "draft" })
  status!: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @ManyToOne(() => Project, (project) => project.contents, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @ManyToOne(() => User, (user) => user.contents, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "author_id" })
  author!: User;

  @OneToMany(() => ContentTag, (ct) => ct.content)
  content_tags!: ContentTag[];
}
