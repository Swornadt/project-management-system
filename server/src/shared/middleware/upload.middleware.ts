import multer from "multer";
import { HttpError } from "./error.middleware";

const MAX_MB = Number(process.env.MAX_FILE_SIZE_MB ?? 25);

const instance = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
});

export function uploadSingle(fieldName = "file") {
  const handler = instance.single(fieldName);
  return (req: any, res: any, next: any) => {
    handler(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new HttpError(413, `File exceeds ${MAX_MB} MB limit`));
        }
        return next(new HttpError(400, err.message));
      }
      if (err) return next(err);
      next();
    });
  };
}