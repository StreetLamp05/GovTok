"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: { ADMIN_PASSCODE?: string } };

const SESSION_DURATION_MS = 30 * 60 * 1000;

export const login = action({
  args: { passcode: v.string() },
  handler: async (ctx, { passcode }) => {
    const configuredPasscode = process.env.ADMIN_PASSCODE;
    if (!configuredPasscode || !sameSecret(passcode, configuredPasscode)) {
      throw new Error("Invalid admin passcode.");
    }

    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    await ctx.runMutation(internal.videoIntakeDb.createAdminSession, { token, expiresAt });
    return { token, expiresAt };
  },
});

function sameSecret(candidate: string, configured: string): boolean {
  if (candidate.length !== configured.length) return false;
  let difference = 0;
  for (let i = 0; i < candidate.length; i++) {
    difference |= candidate.charCodeAt(i) ^ configured.charCodeAt(i);
  }
  return difference === 0;
}
