import { expect, test } from "vitest";
import { photoToJpeg } from "../../../lib/media/photos";

// Real Chromium decoding: sizes, EXIF orientation and metadata stripping (§4.1.1).

/** A JPEG of the given size, red on the left half and blue on the right. */
async function jpeg(width: number, height: number): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f00";
  ctx.fillRect(0, 0, width / 2, height);
  ctx.fillStyle = "#00f";
  ctx.fillRect(width / 2, 0, width / 2, height);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95));
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Inserts an EXIF APP1 segment right after SOI, as a phone camera writes it: IFD0 with
 * Orientation and a pointer to a GPS IFD holding GPSLatitudeRef "N".
 */
function withExif(jpegBytes: Uint8Array, orientation: number): Uint8Array {
  const tiff = new DataView(new ArrayBuffer(56));
  tiff.setUint16(0, 0x4d4d); // "MM", big-endian
  tiff.setUint16(2, 42);
  tiff.setUint32(4, 8); // IFD0 offset
  tiff.setUint16(8, 2); // IFD0: 2 entries
  tiff.setUint16(10, 0x0112); // Orientation
  tiff.setUint16(12, 3); // SHORT
  tiff.setUint32(14, 1);
  tiff.setUint16(18, orientation);
  tiff.setUint16(22, 0x8825); // GPSInfo IFD pointer
  tiff.setUint16(24, 4); // LONG
  tiff.setUint32(26, 1);
  tiff.setUint32(30, 38);
  tiff.setUint32(34, 0); // no next IFD
  tiff.setUint16(38, 1); // GPS IFD: 1 entry
  tiff.setUint16(40, 0x0001); // GPSLatitudeRef
  tiff.setUint16(42, 2); // ASCII
  tiff.setUint32(44, 2);
  tiff.setUint8(48, "N".charCodeAt(0));
  tiff.setUint32(52, 0);
  const header = [0xff, 0xe1, 0, 2 + 6 + 56, ...new TextEncoder().encode("Exif"), 0, 0];
  return new Uint8Array([...jpegBytes.slice(0, 2), ...header, ...new Uint8Array(tiff.buffer), ...jpegBytes.slice(2)]);
}

/** The marker of every segment before the image data. */
function markers(bytes: Uint8Array): number[] {
  const found: number[] = [];
  for (let i = 2; i + 4 <= bytes.length && bytes[i] === 0xff; ) {
    const marker = bytes[i + 1];
    found.push(marker);
    if (marker === 0xda) break; // start of scan
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return found;
}

async function size(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  return [bitmap.width, bitmap.height];
}

async function pixel(blob: Blob, x: number, y: number) {
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const [r, , b] = ctx.getImageData(x, y, 1, 1).data;
  return r > 200 && b < 60 ? "red" : b > 200 && r < 60 ? "blue" : `rgb(${r},?,${b})`;
}

const asBlob = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: "image/jpeg" });

test("phone-sized photos come out as JPEGs with the long edge at 1280 and the aspect ratio kept", async () => {
  for (const [w, h, out] of [
    [4032, 3024, [1280, 960]],
    [3024, 4032, [960, 1280]],
    [4000, 1000, [1280, 320]],
  ] as const) {
    const photo = await photoToJpeg(asBlob(await jpeg(w, h)));
    expect(photo.type).toBe("image/jpeg");
    expect(await size(photo)).toEqual(out);
  }
});

test("a photo already under 1280 isn't scaled up", async () => {
  expect(await size(await photoToJpeg(asBlob(await jpeg(640, 480))))).toEqual([640, 480]);
});

test("a portrait photo stored sideways with EXIF orientation 6 comes out upright", async () => {
  // Stored 1600×800 with red on the left. Orientation 6 means "rotate 90° clockwise to view",
  // so the upright photo is 800×1600 with red on top.
  const input = asBlob(withExif(await jpeg(1600, 800), 6));
  const photo = await photoToJpeg(input);
  expect(await size(photo)).toEqual([640, 1280]);
  expect(await pixel(photo, 320, 100)).toBe("red");
  expect(await pixel(photo, 320, 1180)).toBe("blue");

  // Control: the same photo tagged orientation 1 (as stored) stays landscape, red on the left.
  const control = await photoToJpeg(asBlob(withExif(await jpeg(1600, 800), 1)));
  expect(await size(control)).toEqual([1280, 640]);
  expect(await pixel(control, 100, 320)).toBe("red");
});

test("the output has no EXIF segment, so no GPS", async () => {
  const input = withExif(await jpeg(1600, 800), 1);
  expect(markers(input)).toContain(0xe1);
  const output = new Uint8Array(await (await photoToJpeg(asBlob(input))).arrayBuffer());
  expect(markers(output)).not.toContain(0xe1);
  expect(new TextDecoder("latin1").decode(output)).not.toContain("Exif");
});

test("a file that isn't an image is refused", async () => {
  await expect(photoToJpeg(new Blob(["not a photo"], { type: "image/jpeg" }))).rejects.toThrow();
});
