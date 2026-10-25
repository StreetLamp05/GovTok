import { isHeic, keepPhotos, photoToJpeg } from "./photos";

// Picked photos (§4.1.1) ready to post: the first 10, each an upright JPEG of 1280 px or less.
// Used by CameraCapture's Upload button (it replaced US9's PhotoPicker).

export const HEIC_HINT = "This browser can't open HEIC photos. Try JPEGs.";
export const UNREADABLE_PHOTOS = "We couldn't read those photos. Try different ones.";

export type PreparedPhotos = {
  jpegs: Blob[];
  /** Picked past the 10-photo limit, and left out. */
  cut: number;
  /** Couldn't be decoded, and left out. */
  unreadable: number;
  /** At least one unreadable photo was HEIC (Android and desktop Chrome can't decode it). */
  heic: boolean;
};

export async function prepareJpegs(files: readonly File[]): Promise<PreparedPhotos> {
  const { kept, cut } = keepPhotos(files);
  // One at a time: full-size phone photos decoded together can run an iPhone out of memory.
  const jpegs: Blob[] = [];
  let heic = false;
  for (const file of kept) {
    try {
      jpegs.push(await photoToJpeg(file));
    } catch {
      heic ||= isHeic(file);
    }
  }
  return { jpegs, cut, unreadable: kept.length - jpegs.length, heic };
}

/** What to say when none of the picked photos could be read. */
export const noPhotosMessage = (heic: boolean) => (heic ? HEIC_HINT : UNREADABLE_PHOTOS);
