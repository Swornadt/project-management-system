import path from "path";
import { fileTypeFromBuffer } from "file-type";
import { HttpError } from "../../shared/middleware/error.middleware";

const ATTACHMENT_MIMES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "application/pdf": ["pdf"],
  "text/plain": ["txt"],
  "text/csv": ["csv"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
};

const AVATAR_MIMES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
};

const TEXT_EXTENSION_TO_MIME: Record<string, string> = {
  txt: "text/plain",
  csv: "text/csv",
};

const MAX_ATTACHMENT_MB = Number(process.env.MAX_FILE_SIZE_MB ?? 25);
const MAX_AVATAR_MB = Number(process.env.MAX_AVATAR_SIZE_MB ?? 5);

export interface ValidatedFile {
  mimeType: string;
  extension: string;
  sizeBytes: number;
}

export async function validateAttachment(
  buffer: Buffer,
  originalName: string
): Promise<ValidatedFile> {
  return validate(buffer, originalName, ATTACHMENT_MIMES, MAX_ATTACHMENT_MB);
}

export async function validateAvatar(
  buffer: Buffer,
  originalName: string
): Promise<ValidatedFile> {
  return validate(buffer, originalName, AVATAR_MIMES, MAX_AVATAR_MB);
}

async function validate(
  buffer: Buffer,
  originalName: string,
  allowed: Record<string, string[]>,
  maxMb: number
): Promise<ValidatedFile> {
  if (buffer.length === 0) {
    throw new HttpError(400, "File is empty");
  }

  if (buffer.length > maxMb * 1024 * 1024) {
    throw new HttpError(413, `File exceeds ${maxMb} MB limit`);
  }

  const ext = path.extname(originalName).replace(".", "").toLowerCase();

  const detected = await fileTypeFromBuffer(buffer);

  let mimeType: string | undefined;

  if (detected) {
    mimeType = detected.mime;
  } else if (TEXT_EXTENSION_TO_MIME[ext]) {
    mimeType = TEXT_EXTENSION_TO_MIME[ext];
  }

  if (!mimeType) {
    throw new HttpError(400, "Unable to determine file type");
  }

  const allowedExts = allowed[mimeType];

  if (!allowedExts) {
    throw new HttpError(415, `Unsupported file type: ${mimeType}`);
  }

  if (!allowedExts.includes(ext)) {
    throw new HttpError(400, "File extension does not match its content");
  }

  return {
    mimeType,
    extension: ext,
    sizeBytes: buffer.length,
  };
}