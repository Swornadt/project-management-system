import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { User } from "./user.entity";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn("uuid")
  role_id!: string;

  @Column({ type: "varchar", length: 50 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}
