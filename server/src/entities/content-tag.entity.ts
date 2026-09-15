import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Content } from "./content.entity";
import { Tag } from "./tag.entity";

@Entity("content_tags")
export class ContentTag {
  @Column({ type: "uuid", primary: true })
  content_id!: string;

  @Column({ type: "uuid", primary: true })
  tag_id!: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @ManyToOne(() => Content, (content) => content.content_tags, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "content_id" })
  content!: Content;

  @ManyToOne(() => Tag, (tag) => tag.content_tags, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "tag_id" })
  tag!: Tag;
}
