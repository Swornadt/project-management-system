export interface TagResponse {
  tag_id: string;
  name: string;
  slug: string;
  created_at: Date;
}

export interface CreateTagDto {
  name: string;
  slug: string;
}

export interface UpdateTagDto {
  name?: string;
  slug?: string;
}
