import bcrypt from "bcryptjs";
import { BaseCRUDService } from "../../shared/services/base.service";
import { User } from "../../entities/user.entity";
import type { CreateUserDto, UpdateUserDto } from "./users.dto";

export class UsersService extends BaseCRUDService<User, CreateUserDto, UpdateUserDto> {
  constructor() {
    super(User, "user_id");
  }

  override async create(payload: CreateUserDto): Promise<User> {
    const password_hash = await bcrypt.hash(payload.password, 10);
    const { password, ...rest } = payload;
    const toSave = { ...rest, password_hash } as Partial<User> as CreateUserDto;
    return super.create(toSave);
  }

  override async update(id: string, payload: UpdateUserDto): Promise<User | null> {
    if (payload.password) {
      const password_hash = await bcrypt.hash(payload.password, 10);
      const { password, ...rest } = payload;
      const toSave = { ...rest, password_hash } as UpdateUserDto;
      return super.update(id, toSave);
    }
    return super.update(id, payload);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo().findOne({ where: { email }, relations: { role: true } });
  }

  async findOneWithRole(id: string): Promise<User | null> {
    return this.findOne(id, { role: true });
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  toResponse(user: User): Omit<User, "password_hash"> {
    const { password_hash: _ph, ...rest } = user;
    void _ph;
    return rest;
  }
}

export const usersService = new UsersService();
