import { mutation, query } from "./_generated/server";

// Placeholder functions (US1) that back the home page's live value. US5/US6 delete these.
export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("placeholder").first();
  },
});

export const bump = mutation({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("placeholder").first();
    if (row) {
      await ctx.db.patch(row._id, { count: row.count + 1 });
      return row.count + 1;
    }
    await ctx.db.insert("placeholder", { label: "hello", count: 1 });
    return 1;
  },
});
