import { convertClip, isTooLong, needsConversion } from "./convertClip";
import { clipDurationS } from "./frames";

// A clip from a file, made postable (§4.1.1): converted when its format, size or length needs it,
// otherwise passed through. For callers outside a tap, like the seed page (US25). The camera
// (useClipRecorder) does the same in two steps so the conversion can start inside the tap.
// A clip that needs converting by type or size starts converting synchronously, so calling this
// straight from a file input's change handler keeps the tap for iOS (see convertClip).
export async function normalizeClip(file: Blob, options: Parameters<typeof convertClip>[1] = {}): Promise<Blob> {
  if (needsConversion(file)) return await convertClip(file, options);
  // A clip whose length can't be read goes on as it is; framesFromFile will say if it's unreadable.
  if (isTooLong(await clipDurationS(file).catch(() => 0))) return await convertClip(file, options);
  return file;
}
