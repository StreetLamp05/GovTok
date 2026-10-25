const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["video/mp4", "video/webm"]);

export function validateVideoMetadata(contentType: string, fileSize: number): string {
  const normalizedType = contentType.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(normalizedType)) {
    throw new Error("Only MP4 and WebM videos can be uploaded.");
  }
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    throw new Error("Videos must be larger than 0 bytes and 25 MB or smaller.");
  }
  return normalizedType;
}
