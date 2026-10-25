// MediaRecorder mime types in order of preference (§4.1.1). The explicit avc1 + AAC type
// comes first because Chrome's plain `video/mp4` may carry Opus audio, which iOS can't play.
export const MIME_TYPE_PREFERENCE = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm"] as const;

export function normalizeMimeType(mimeType: string): string {
  return mimeType.split(";")[0].trim().toLowerCase();
}

/** The first supported type, or "" to let the browser pick its default. */
export function pickMimeType(isTypeSupported: (type: string) => boolean): string {
  return MIME_TYPE_PREFERENCE.find((type) => isTypeSupported(type)) ?? "";
}
