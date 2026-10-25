import { RateLimitError } from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { blobToImage, callClaudeJSON, ClaudeError, DEFAULT_CLAUDE_MODEL } from "../../../convex/lib/claude";

const { create, construct } = vi.hoisted(() => ({ create: vi.fn(), construct: vi.fn() }));

vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  class FakeAnthropic {
    beta = { messages: { create } };
    constructor(options: unknown) {
      construct(options);
    }
  }
  return { ...actual, default: FakeAnthropic };
});

const SCHEMA = { type: "object", additionalProperties: false, required: ["ok"], properties: { ok: { type: "boolean" } } };
const CONTENT = [{ type: "text" as const, text: "hi" }];

function reply(text: string, stop_reason = "end_turn", extra: object = {}) {
  return { stop_reason, stop_details: null, content: [{ type: "text", text }], ...extra };
}

async function callError() {
  return callClaudeJSON({ system: "s", content: CONTENT, schema: SCHEMA }).then(
    () => expect.unreachable("expected callClaudeJSON to throw"),
    (error: unknown) => error as ClaudeError,
  );
}

beforeEach(() => {
  create.mockReset();
  construct.mockReset();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("CLAUDE_MODEL", "claude-test-model");
});
afterEach(() => vi.unstubAllEnvs());

describe("callClaudeJSON", () => {
  test("sends the configured model at effort low with the JSON schema and the refusal fallback", async () => {
    create.mockResolvedValue(reply('{"ok":true}'));
    await expect(callClaudeJSON({ system: "sys", content: CONTENT, schema: SCHEMA })).resolves.toEqual({ ok: true });

    expect(construct).toHaveBeenCalledWith({ apiKey: "test-key", maxRetries: 0 });
    const params = create.mock.calls[0][0];
    expect(params).toMatchObject({
      model: "claude-test-model",
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: "sys",
      messages: [{ role: "user", content: CONTENT }],
    });
    // No sampling or disabled-thinking params: Opus 5.5 rejects both.
    for (const key of ["temperature", "top_p", "top_k", "thinking"]) expect(params).not.toHaveProperty(key);
  });

  test("defaults the model to Opus 5.5", async () => {
    vi.stubEnv("CLAUDE_MODEL", "");
    create.mockResolvedValue(reply("{}"));
    await callClaudeJSON({ system: "s", content: CONTENT, schema: SCHEMA });
    expect(create.mock.calls[0][0].model).toBe(DEFAULT_CLAUDE_MODEL);
    expect(DEFAULT_CLAUDE_MODEL).toBe("claude-opus-5-5");
  });

  test("a refusal stop reason throws", async () => {
    create.mockResolvedValue(reply("", "refusal", { stop_details: { type: "refusal", category: "cyber" } }));
    const error = await callError();
    expect(error).toBeInstanceOf(ClaudeError);
    expect(error.kind).toBe("refusal");
    expect(error.message).toContain("cyber");
  });

  test.each(["max_tokens", "pause_turn", "model_context_window_exceeded"])("stop reason %s throws", async (stop) => {
    create.mockResolvedValue(reply('{"ok":', stop));
    const error = await callError();
    expect(error).toBeInstanceOf(ClaudeError);
    expect(error.kind).toBe(stop === "max_tokens" ? "max_tokens" : "bad_stop");
  });

  test("reads the answer after a fallback switch and logs which model answered", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    create.mockResolvedValue({
      model: "claude-fallback-model",
      stop_reason: "end_turn",
      stop_details: null,
      content: [
        { type: "text", text: '{"ok":' },
        { type: "fallback", from: { model: "a" }, to: { model: "b" } },
        { type: "text", text: '{"ok":false}' },
      ],
    });
    await expect(callClaudeJSON({ system: "s", content: CONTENT, schema: SCHEMA })).resolves.toEqual({ ok: false });
    expect(log).toHaveBeenCalledWith("Claude fallback: claude-test-model declined, claude-fallback-model answered");
    log.mockRestore();
  });

  test("doesn't log when no fallback ran", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    create.mockResolvedValue(reply("{}"));
    await callClaudeJSON({ system: "s", content: CONTENT, schema: SCHEMA });
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  test("text that isn't JSON throws", async () => {
    create.mockResolvedValue(reply("not json"));
    expect((await callError()).kind).toBe("bad_output");
  });

  test("a 429 surfaces retry-after in milliseconds", async () => {
    create.mockRejectedValue(
      new RateLimitError(429, { type: "error" }, "rate limited", new Headers({ "retry-after": "7" })),
    );
    const error = await callError();
    expect(error.kind).toBe("rate_limited");
    expect(error.retryAfterMs).toBe(7000);
  });

  test("a 429 with an HTTP-date retry-after surfaces the time left", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-25T12:00:00Z") });
    try {
      create.mockRejectedValue(
        new RateLimitError(429, { type: "error" }, "rate limited", new Headers({ "retry-after": "Sun, 25 Oct 2026 12:00:30 GMT" })),
      );
      expect((await callError()).retryAfterMs).toBe(30_000);
    } finally {
      vi.useRealTimers();
    }
  });

  test("other request errors throw ClaudeError with the cause", async () => {
    const cause = new Error("socket hang up");
    create.mockRejectedValue(cause);
    const error = await callError();
    expect(error.kind).toBe("api");
    expect(error.retryAfterMs).toBeUndefined();
    expect(error.cause).toBe(cause);
  });
});

describe("blobToImage", () => {
  test("base64-encodes the blob and keeps its image type", async () => {
    const bytes = new Uint8Array(70_000).map((_, i) => i % 256);
    const image = await blobToImage(new Blob([bytes], { type: "image/png" }));
    expect(image.mediaType).toBe("image/png");
    expect(Uint8Array.from(atob(image.data), (c) => c.charCodeAt(0))).toEqual(bytes);
  });

  test("treats an untyped blob as a JPEG frame", async () => {
    expect((await blobToImage(new Blob([new Uint8Array([1, 2, 3])]))).mediaType).toBe("image/jpeg");
  });
});
