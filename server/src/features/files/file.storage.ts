import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { HttpError } from "../../shared/middleware/error.middleware";

const ROOT = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

function safeJoin(key: string): string {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT)) {
    throw new HttpError(400, "Invalid storage key");
  }
  return full;
}

export function buildStorageKey(
  userId: string,
  extension: string,
  scope: "attachments" | "avatars" = "attachments"
): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${scope}/${userId}/${day}/${crypto.randomUUID()}.${extension}`;
}

export async function saveFile(key: string, buffer: Buffer): Promise<void> {
  const full = safeJoin(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
}

export async function removeFile(key: string): Promise<void> {
  await fs.unlink(safeJoin(key)).catch(() => undefined);
}

export function resolveFullPath(key: string): string {
  return safeJoin(key);
}

export function fileUrl(fileId: string): string {
  const base = process.env.API_URL ?? "";
  return `${base}/api/v1/files/${fileId}/raw`;
}