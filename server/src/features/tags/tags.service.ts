import { ILike } from "typeorm";
import { BaseCRUDService } from "../../shared/services/base.service";
import { getRepo } from "../../shared/db/repositories";
import { Tag } from "../../entities/tag.entity";
import { ContentTag } from "../../entities/content-tag.entity";
import { HttpError } from "../../shared/middleware/error.middleware";
import type { CreateTagDto, UpdateTagDto } from "./tags.dto";

export class TagsService extends BaseCRUDService<Tag, CreateTagDto, UpdateTagDto> {
  constructor() {
    super(Tag, "tag_id");
  }

  // SRS 5.7: "Prevent accidental duplicate tag/category names within the
  // relevant scope." The DB enforces uniqueness on slug already (see
  // tag.entity.ts), but name has no such constraint — checked here,
  // case-insensitively, so "Backend" and "backend" don't both slip in.
  private async assertNameAvailable(name: string, excludeId?: string): Promise<void> {
    const existing = await this.repo().findOne({ where: { name: ILike(name) } });
    if (existing && existing.tag_id !== excludeId) {
      throw new HttpError(409, `A tag named "${name}" already exists`);
    }
  }

  override async create(payload: CreateTagDto): Promise<Tag> {
    await this.assertNameAvailable(payload.name);
    return super.create(payload);
  }

  override async update(id: string, payload: UpdateTagDto): Promise<Tag | null> {
    if (payload.name) {
      await this.assertNameAvailable(payload.name, id);
    }
    return super.update(id, payload);
  }

  // ContentTag has a composite primary key (content_id + tag_id), so it
  // can't extend BaseCRUDService — these are hand-written against the join
  // table directly rather than forced through a single-id abstraction.
  async attachToContent(tagId: string, contentId: string): Promise<ContentTag> {
    const tag = await this.findOne(tagId);
    if (!tag) throw new HttpError(404, "Tag not found");

    const ctRepo = getRepo(ContentTag);
    const existing = await ctRepo.findOne({
      where: { tag_id: tagId, content_id: contentId },
    });
    if (existing) {
      throw new HttpError(409, "Tag is already attached to this content");
    }

    const contentTag = ctRepo.create({ tag_id: tagId, content_id: contentId });
    return ctRepo.save(contentTag);
  }

  async detachFromContent(tagId: string, contentId: string): Promise<boolean> {
    const ctRepo = getRepo(ContentTag);
    const result = await ctRepo.delete({ tag_id: tagId, content_id: contentId });
    return (result.affected ?? 0) > 0;
  }

  async listTagsForContent(contentId: string): Promise<Tag[]> {
    const ctRepo = getRepo(ContentTag);
    const links = await ctRepo.find({
      where: { content_id: contentId },
      relations: { tag: true },
    });
    return links.map((link) => link.tag);
  }
}

export const tagsService = new TagsService();
