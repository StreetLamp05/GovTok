import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribe } from "./transcribe";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("transcribe", () => {
  it("sends an MP4 to Groq and returns text with timestamped segments", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          text: "There is a pothole here.",
          segments: [
            {
              id: 0,
              start: 0.2,
              end: 1.4,
              text: "There is a pothole here.",
              avg_logprob: -0.15,
              compression_ratio: 0.98,
              no_speech_prob: 0,
              tokens: [1, 2, 3],
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribe(
      new Blob(["video bytes"], { type: "video/mp4" }),
      "video/mp4",
      "clip.mp4",
      "test-key",
    );

    expect(result).toEqual({
      text: "There is a pothole here.",
      segments: [{ start: 0.2, end: 1.4, text: "There is a pothole here." }],
    });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
    expect(request.method).toBe("POST");
    expect(new Headers(request.headers).get("authorization")).toBe("Bearer test-key");
    const form = request.body as FormData;
    expect(form.get("model")).toBe("whisper-large-v3-turbo");
    expect(form.get("response_format")).toBe("verbose_json");
    expect((form.get("file") as File).name).toBe("clip.mp4");
  });

  it("includes Groq's error and retry-after in failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "30" },
        }),
      ),
    );

    await expect(
      transcribe(new Blob(["video"]), "video/webm", "clip.webm", "test-key"),
    ).rejects.toThrow("Groq transcription failed (429). Retry after 30 seconds. rate limited");
  });

  it("rejects unsupported formats before calling Groq", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(transcribe(new Blob(["video"]), "video/quicktime", "clip.mov", "test-key")).rejects.toThrow(
      "Only MP4 and WebM videos can be transcribed.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
