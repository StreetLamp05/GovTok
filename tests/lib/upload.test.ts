// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";

const mutation = vi.fn();
vi.mock("convex/browser", () => ({
  ConvexHttpClient: vi.fn(function () {
    return { mutation };
  }),
}));

const UPLOAD_URL = "https://convex.example/upload?token=abc";
const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("govtok.residentToken", "device-1");
  mutation.mockResolvedValue(UPLOAD_URL);
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ storageId: "storage-1" }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function load() {
  vi.resetModules();
  return (await import("../../lib/upload")).uploadFile;
}

test("uploadFile(blob) gets an upload URL as this device's resident, POSTs the blob and returns the storage ID", async () => {
  const uploadFile = await load();
  const blob = new Blob(["clip"], { type: "video/mp4" });

  expect(await uploadFile(blob)).toBe("storage-1");

  expect(mutation).toHaveBeenCalledWith(api.files.generateUploadUrl, { token: "device-1" });
  expect(fetchMock).toHaveBeenCalledWith(UPLOAD_URL, {
    method: "POST",
    headers: { "Content-Type": "video/mp4" },
    body: blob,
  });
});

test("a fixer uploads with their fixer token instead", async () => {
  const uploadFile = await load();
  await uploadFile(new Blob(["fix"], { type: "video/webm" }), { fixerToken: "fixer-token" });
  expect(mutation).toHaveBeenCalledWith(api.files.generateUploadUrl, { fixerToken: "fixer-token" });
});

test("uploadFile removes codec parameters from the Content-Type header", async () => {
  const uploadFile = await load();
  const blob = new Blob(["clip"], { type: "video/mp4;codecs=avc1,mp4a.40.2" });

  await uploadFile(blob);

  expect(fetchMock).toHaveBeenCalledWith(UPLOAD_URL, {
    method: "POST",
    headers: { "Content-Type": "video/mp4" },
    body: blob,
  });
});

test("a failed POST throws", async () => {
  fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));
  const uploadFile = await load();
  await expect(uploadFile(new Blob(["x"]))).rejects.toThrow(/Upload failed \(500\)/);
});
