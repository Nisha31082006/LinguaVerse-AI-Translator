import multer from "multer";
import path from "path";
import { AppError } from "./errorHandler";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

function makeUpload(allowedMimeTypes: Set<string>, maxSizeBytes: number, label: string) {
  return multer({
    storage,
    limits: { fileSize: maxSizeBytes },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        return cb(new AppError(`Unsupported file type for ${label}: ${file.mimetype}`, 400));
      }
      cb(null, true);
    },
  });
}

export const imageUpload = makeUpload(
  new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
  MAX_IMAGE_SIZE_BYTES,
  "OCR",
);

// Local Whisper transcription (see ai/whisper.local.ts) only decodes WAV —
// adding MP3/M4A/OGG support would require an ffmpeg transcoding step,
// which this project deliberately avoids to keep Windows installs simple.
export const audioUpload = makeUpload(
  new Set(["audio/wav", "audio/x-wav", "audio/wave"]),
  MAX_AUDIO_SIZE_BYTES,
  "speech transcription (.wav only)",
);

export const documentUpload = makeUpload(
  new Set([
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  ]),
  MAX_DOCUMENT_SIZE_BYTES,
  "document translation (.txt and .docx only for now)",
);
