import type { EntityTarget, FindOptionsWhere, ObjectLiteral } from "typeorm";
import { getRepo } from "../db/repositories";
import type {
  FilterParams,
  PaginatedResponse,
  PaginationParams,
  SortParams,
} from "../types";

export type CreateDtoFor<Entity> = Partial<{
  [K in keyof Entity]: Entity[K];
}>;

export type UpdateDtoFor<Entity> = Partial<{
  [K in keyof Entity]: Entity[K];
}>;

export abstract class BaseCRUDService<
  Entity extends ObjectLiteral,
  CreateDTO = CreateDtoFor<Entity>,
  UpdateDTO = UpdateDtoFor<Entity>
> {
  protected readonly entity: EntityTarget<Entity>;
  protected readonly idKey: keyof Entity;

  constructor(entity: EntityTarget<Entity>, idKey: keyof Entity) {
    this.entity = entity;
    this.idKey = idKey;
  }

  protected repo() {
    return getRepo(this.entity);
  }

  public getRepository() {
    return this.repo();
  }

  async findAll(
    pagination: PaginationParams = {},
    sort: SortParams = {},
    filters: FilterParams = {}
  ): Promise<PaginatedResponse<Entity>> {
    const limit = Math.min(
      Math.max(typeof pagination.limit === "number" ? pagination.limit : 20, 1),
      100
    );
    const offset = Math.max(
      typeof pagination.offset === "number" ? pagination.offset : 0,
      0
    );

    const where = filters as FindOptionsWhere<Entity>;
    const order = sort.sortBy
      ? ({ [sort.sortBy]: (sort.sortOrder ?? "asc").toUpperCase() } as any)
      : undefined;

    const [items, total] = await this.repo().findAndCount({
      where,
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

  async findOne(id: string, relations: any = {}): Promise<Entity | null> {
    const where = { [this.idKey]: id } as FindOptionsWhere<Entity>;
    const result = await this.repo().findOne({
      where,
      relations,
    });
    return result ?? null;
  }

  async create(payload: CreateDTO): Promise<Entity> {
    const entity = this.repo().create(payload as any);
    return this.repo().save(entity as any) as Promise<Entity>;
  }

  async update(id: string, payload: UpdateDTO): Promise<Entity | null> {
    const existing = await this.findOne(id);
    if (!existing) return null;
    const merged = this.repo().merge(existing, payload as any);
    return this.repo().save(merged as any) as Promise<Entity>;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repo().delete({
      [this.idKey]: id,
    } as FindOptionsWhere<Entity>);
    return (result.affected ?? 0) > 0;
  }
}
