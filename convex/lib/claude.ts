import Anthropic, { APIError, RateLimitError } from "@anthropic-ai/sdk";

// The one Claude call shape (§1.1.3), shared by screening (US12/US13) and proof-of-fix (US22).
// Server-only: import it from Convex actions, never from app/ or lib/, so ANTHROPIC_API_KEY
// stays in Convex env.

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";

// On a policy decline the API re-runs the request on a fallback model it picks by
// refusal category. A refusal that survives the chain still comes back as `refusal`.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

// Room for adaptive thinking plus a short JSON answer, and still under the
// non-streaming SDK timeout.
const MAX_TOKENS = 16000;

export type ImageMediaType = Anthropic.Beta.BetaBase64ImageSource["media_type"];
export type ImageInput = { mediaType: ImageMediaType; data: string }; // data is base64

export type ClaudeErrorKind = "refusal" | "max_tokens" | "bad_stop" | "bad_output" | "rate_limited" | "api";

// Every failure throws this. Callers retry once (§4.2.1), waiting `retryAfterMs` when it's set.
export class ClaudeError extends Error {
  constructor(
    readonly kind: ClaudeErrorKind,
    message: string,
    readonly retryAfterMs?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ClaudeError";
  }
}

// Base64, not URLs: local Convex storage URLs point at localhost, which Anthropic can't fetch.
export function imageBlock({ mediaType, data }: ImageInput): Anthropic.Beta.BetaImageBlockParam {
  return { type: "image", source: { type: "base64", media_type: mediaType, data } };
}

const IMAGE_MEDIA_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// For a blob from `ctx.storage.get`. Frames from the browser canvas are JPEGs (§1.1.3).
// btoa rather than Buffer, so this also works outside "use node" files.
export async function blobToImage(blob: Blob): Promise<ImageInput> {
  const mediaType = IMAGE_MEDIA_TYPES.includes(blob.type) ? (blob.type as ImageMediaType) : "image/jpeg";
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { mediaType, data: btoa(binary) };
}

// `retry-after` is seconds or an HTTP date.
function parseRetryAfter(headers: Headers | undefined): number | undefined {
  const value = headers?.get("retry-after");
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

export async function callClaudeJSON({
  system,
  content,
  schema,
}: {
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  schema: Record<string, unknown>;
}): Promise<unknown> {
  // maxRetries 0: the pipeline owns the single retry, so SDK retries would stack on top of it.
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });

  const model = process.env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL;
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      system,
      messages: [{ role: "user", content }],
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new ClaudeError("rate_limited", `Claude rate limited: ${error.message}`, parseRetryAfter(error.headers), {
        cause: error,
      });
    }
    const detail = error instanceof APIError ? `${error.status ?? "connection"}: ${error.message}` : String(error);
    throw new ClaudeError("api", `Claude request failed (${detail})`, undefined, { cause: error });
  }

  if (response.stop_reason === "refusal") {
    const category = response.stop_details?.category ?? "unspecified";
    throw new ClaudeError("refusal", `Claude refused (category: ${category})`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new ClaudeError("max_tokens", "Claude hit max_tokens before finishing its JSON");
  }
  if (response.stop_reason !== "end_turn") {
    throw new ClaudeError("bad_stop", `Unexpected Claude stop_reason: ${response.stop_reason}`);
  }

  // The answer is the text after the last fallback switch, if there was one. §1.1.3 picked
  // Opus for face and plate recall, so log when another model answered.
  const lastFallback = response.content.findLastIndex((block) => block.type === "fallback");
  if (lastFallback >= 0) console.log(`Claude fallback: ${model} declined, ${response.model} answered`);
  const text = response.content
    .slice(lastFallback + 1)
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ClaudeError("bad_output", "Claude returned text that isn't JSON", undefined, { cause: error });
  }
}
