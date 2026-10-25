import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// §7.1.1: delete held reports and unverified fix attempts older than 7 days.
crons.daily("purge expired held reports", { hourUTC: 10, minuteUTC: 0 }, internal.purge.purgeExpired, {});

export default crons;
