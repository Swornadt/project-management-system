import bcrypt from "bcryptjs";
import { IsNull, Not, ILike, In } from "typeorm";
import { BaseCRUDService } from "../../shared/services/base.service";
import { User } from "../../entities/user.entity";
import { RefreshToken } from "../../entities/refresh-token.entity";
import type { CreateUserDto, UpdateUserDto, SearchUsersDto, UserStatsResponse } from "./users.dto";
import type { PaginationParams, SortParams, PaginatedResponse } from "../../shared/types";

export class UsersService extends BaseCRUDService<User, CreateUserDto, UpdateUserDto> {
  constructor() {
    super(User, "user_id");
  }

  override async create(payload: CreateUserDto): Promise<User> {
    const password_hash = await bcrypt.hash(payload.password, 10);
    const { password, ...rest } = payload;
    const toSave = { 
      ...rest, 
      password_hash,
      email_verified: false,
      status: payload.status || 'active'
    } as Partial<User> as CreateUserDto;
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

  override async findAll(
    pagination: PaginationParams = {},
    sort: SortParams = {}
  ): Promise<PaginatedResponse<User>> {
    const limit = Math.min(
      Math.max(typeof pagination.limit === "number" ? pagination.limit : 20, 1),
      100
    );
    const offset = Math.max(
      typeof pagination.offset === "number" ? pagination.offset : 0,
      0
    );

    const order = sort.sortBy
      ? ({ [sort.sortBy]: (sort.sortOrder ?? "asc").toUpperCase() } as any)
      : { created_at: "DESC" as any };

    const [items, total] = await this.repo().findAndCount({
      where: { deleted_at: IsNull() },
      relations: { role: true },
      order,
      skip: offset,
      take: limit,
    });

    return {
      items,
      total,
      limit,
      offset,
      count: items.length,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo().findOne({ 
      where: { email, deleted_at: IsNull() }, 
      relations: { role: true } 
    });
  }

  async findOneWithRole(id: string): Promise<User | null> {
    return this.repo().findOne({
      where: { user_id: id, deleted_at: IsNull() },
      relations: { role: true }
    });
  }

  async search(
    filters: SearchUsersDto,
    pagination: PaginationParams = {},
    sort: SortParams = {}
  ): Promise<PaginatedResponse<User>> {
    const limit = Math.min(
      Math.max(typeof pagination.limit === "number" ? pagination.limit : 20, 1),
      100
    );
    const offset = Math.max(
      typeof pagination.offset === "number" ? pagination.offset : 0,
      0
    );

    const where: any = { deleted_at: IsNull() };

    if (filters.q) {
      where.first_name = ILike(`%${filters.q}%`);
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.email_verified !== undefined) {
      where.email_verified = filters.email_verified;
    }

    const order = sort.sortBy
      ? ({ [sort.sortBy]: (sort.sortOrder ?? "asc").toUpperCase() } as any)
      : { created_at: "DESC" as any };

    let query = this.repo()
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.role", "role")
      .where("user.deleted_at IS NULL");

    if (filters.q) {
      query = query.andWhere(
        "(user.first_name ILIKE :q OR user.last_name ILIKE :q OR user.email ILIKE :q)",
        { q: `%${filters.q}%` }
      );
    }

    if (filters.status) {
      query = query.andWhere("user.status = :status", { status: filters.status });
    }

    if (filters.role) {
      query = query.andWhere("role.name = :roleName", { roleName: filters.role });
    }

    if (filters.email_verified !== undefined) {
      query = query.andWhere("user.email_verified = :verified", { 
        verified: filters.email_verified 
      });
    }

    const [items, total] = await query
      .orderBy(`user.${sort.sortBy || 'created_at'}`, sort.sortOrder?.toUpperCase() as any || 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      limit,
      offset,
      count: items.length,
    };
  }

  async updateRole(id: string, role_id: string): Promise<User | null> {
    const user = await this.findOneWithRole(id);
    if (!user) return null;

    user.role_id = role_id;
    return this.repo().save(user);
  }

  async updateStatus(id: string, status: string): Promise<User | null> {
    const user = await this.findOneWithRole(id);
    if (!user) return null;

    user.status = status;
    return this.repo().save(user);
  }

  async softDelete(id: string): Promise<boolean> {
    const user = await this.findOne(id);
    if (!user) return false;

    user.deleted_at = new Date();
    await this.repo().save(user);
    return true;
  }

  async restore(id: string): Promise<User | null> {
    const user = await this.repo().findOne({
      where: { user_id: id, deleted_at: Not(IsNull()) }
    });
    
    if (!user) return null;

    user.deleted_at = null as any;
    return this.repo().save(user);
  }

  async revokeAllTokens(userId: string): Promise<void> {
    await this.repo().manager.update(
      RefreshToken,
      { user_id: userId, revoked_at: IsNull() },
      { revoked_at: new Date() }
    );
  }

  async getStats(): Promise<UserStatsResponse> {
    const repo = this.repo();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      total,
      active,
      inactive,
      suspended,
      verified,
      unverified,
      locked,
      recentlyCreated
    ] = await Promise.all([
      repo.count({ where: { deleted_at: IsNull() } }),
      repo.count({ where: { deleted_at: IsNull(), status: 'active' } }),
      repo.count({ where: { deleted_at: IsNull(), status: 'inactive' } }),
      repo.count({ where: { deleted_at: IsNull(), status: 'suspended' } }),
      repo.count({ where: { deleted_at: IsNull(), email_verified: true } }),
      repo.count({ where: { deleted_at: IsNull(), email_verified: false } }),
      repo.createQueryBuilder("user")
        .where("user.deleted_at IS NULL")
        .andWhere("user.locked_until > :now", { now })
        .getCount(),
      repo.createQueryBuilder("user")
        .where("user.deleted_at IS NULL")
        .andWhere("user.created_at >= :sevenDaysAgo", { sevenDaysAgo })
        .getCount()
    ]);

    const roleStats = await repo
      .createQueryBuilder("user")
      .leftJoin("user.role", "role")
      .select("role.name", "roleName")
      .addSelect("COUNT(*)", "count")
      .where("user.deleted_at IS NULL")
      .groupBy("role.name")
      .getRawMany();

    const byRole: Record<string, number> = {};
    roleStats.forEach(stat => {
      byRole[stat.roleName || 'Unknown'] = parseInt(stat.count);
    });

    return {
      total,
      active,
      inactive,
      suspended,
      verified,
      unverified,
      locked,
      byRole,
      recentlyCreated
    };
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
