// For the manual check that `audio={false}` clips have no audio track. Reads the container
// directly, since browsers don't agree on an API for a video element's audio tracks.

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

function indexOf(bytes: Uint8Array, needle: number[], from = 0): number {
  outer: for (let i = from; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

const HDLR = ascii("hdlr");
const SOUN = ascii("soun");
const WEBM_AUDIO_CODECS = ["A_OPUS", "A_VORBIS", "A_AAC"].map(ascii);
// Track headers sit at the start of MediaRecorder output (fragmented MP4 `moov`, webm `Tracks`).
// Phone camera-app files can put `moov` at the end, so they also check the last 1 MB.
const SCAN_BYTES = 1 << 20;

function scan(bytes: Uint8Array): boolean {
  // MP4: a `hdlr` box whose handler type is `soun`. After the box type come version/flags
  // (4 bytes) and pre_defined (4 bytes), so the handler type starts 12 bytes after `hdlr`.
  for (let i = indexOf(bytes, HDLR); i !== -1; i = indexOf(bytes, HDLR, i + 1)) {
    if (indexOf(bytes.subarray(i + 12, i + 16), SOUN) === 0) return true;
  }
  return WEBM_AUDIO_CODECS.some((codec) => indexOf(bytes, codec) !== -1);
}

export async function hasAudioTrack(blob: Blob): Promise<boolean> {
  const head = new Uint8Array(await blob.slice(0, SCAN_BYTES).arrayBuffer());
  if (scan(head)) return true;
  if (blob.size <= SCAN_BYTES) return false;
  return scan(new Uint8Array(await blob.slice(-SCAN_BYTES).arrayBuffer()));
}
