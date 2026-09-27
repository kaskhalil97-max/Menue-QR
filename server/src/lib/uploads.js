import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.join(__dirname, "../../uploads");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = MIME_EXTENSIONS[file.mimetype] || "";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!MIME_EXTENSIONS[file.mimetype]) {
    cb(new Error("unsupported_file_type"));
    return;
  }
  cb(null, true);
}

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
