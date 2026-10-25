import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireFixer } from "./lib/auth";
import { publicReport, publicReportOrNull } from "./lib/publicReport";

// Fixer access (§3.1.2): a passcode per fixer, kept in the DB. The passcode is checked
// once, server-side, and swapped for a token the /fix screen keeps in localStorage.

// The same message for every failure, so it never hints whether a passcode exists.
const WRONG_PASSCODE = "Wrong passcode";

// npx convex run fixers:seed '{"fixers":[{"name":"…","org":"Mableton Sanitation","passcode":"…"}]}'
// Upserts by passcode, so re-running it updates names and orgs without duplicating rows
// or logging anyone out. Seeding a fixer under a new passcode adds a second row and leaves
// the old passcode (and its token) working: to revoke a passcode, delete its row in the
// Convex dashboard.
export const seed = internalMutation({
  args: { fixers: v.array(v.object({ name: v.string(), org: v.string(), passcode: v.string() })) },
  handler: async (ctx, { fixers }) => {
    const seen = new Set<string>();
    for (const fixer of fixers) {
      const passcode = fixer.passcode.trim();
      if (!passcode) throw new ConvexError(`Passcode for ${fixer.name} is empty`);
      if (seen.has(passcode)) throw new ConvexError(`Passcode for ${fixer.name} is used twice`);
      seen.add(passcode);
    }

    let inserted = 0;
    let updated = 0;
    for (const fixer of fixers) {
      const passcode = fixer.passcode.trim();
      const row = { name: fixer.name.trim(), org: fixer.org.trim(), passcode };
      const existing = await ctx.db
        .query("fixers")
        .withIndex("by_passcode", (q) => q.eq("passcode", passcode))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, row);
        updated++;
      } else {
        await ctx.db.insert("fixers", row);
        inserted++;
      }
    }
    return { inserted, updated };
  },
});

// Reuses the fixer's token when it has one, so logging in on a second device doesn't log
// out the first.
export const fixerLogin = mutation({
  args: { passcode: v.string() },
  handler: async (ctx, { passcode }) => {
    const clean = passcode.trim();
    if (!clean) throw new ConvexError(WRONG_PASSCODE);
    const fixer = await ctx.db
      .query("fixers")
      .withIndex("by_passcode", (q) => q.eq("passcode", clean))
      .unique();
    if (!fixer) throw new ConvexError(WRONG_PASSCODE);

    let token = fixer.token;
    if (!token) {
      token = crypto.randomUUID();
      await ctx.db.patch(fixer._id, { token });
    }
    return { token, org: fixer.org };
  },
});

// For the /fix screen to check a stored token without throwing: the fixer's org, or null
// when the token is missing or no longer valid (so the screen asks for the passcode again).
export const fixerSession = query({
  args: { fixerToken: v.string() },
  handler: async (ctx, { fixerToken }) => {
    try {
      const fixer = await requireFixer(ctx, fixerToken);
      return { org: fixer.org };
    } catch (error) {
      if (error instanceof ConvexError) return null;
      throw error;
    }
  },
});

// Every open report, whoever owns it (§4.3.2), through the public projection (§7.1.1).
// The client sorts them nearest first from the phone's location (§5.3.1); Mableton's
// scale doesn't need a bounding box here (§1.1.1).
export const openReportsForFixer = query({
  args: { fixerToken: v.string() },
  handler: async (ctx, { fixerToken }) => {
    await requireFixer(ctx, fixerToken);
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_status_lat", (q) => q.eq("status", "open"))
      .collect();
    return await Promise.all(reports.map((report) => publicReport(ctx, report)));
  },
});

// One report for the fixer's detail screen. Unlike the list, it keeps returning the report
// once it's fixed, so the screen can show the result instead of losing it. Null for an ID
// that isn't a public report (unknown, malformed, pending or held).
export const fixerReport = query({
  args: { fixerToken: v.string(), reportId: v.string() },
  handler: async (ctx, { fixerToken, reportId }) => {
    await requireFixer(ctx, fixerToken);
    const id = ctx.db.normalizeId("reports", reportId);
    return id ? await publicReportOrNull(ctx, await ctx.db.get(id)) : null;
  },
});
