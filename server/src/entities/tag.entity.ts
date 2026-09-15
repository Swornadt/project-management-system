import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { ContentTag } from "./content-tag.entity";

@Entity("tags")
export class Tag {
  @PrimaryGeneratedColumn("uuid")
  tag_id!: string;

  @Column({ type: "varchar", length: 50 })
  name!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  slug!: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @OneToMany(() => ContentTag, (ct) => ct.tag)
  content_tags!: ContentTag[];
}
