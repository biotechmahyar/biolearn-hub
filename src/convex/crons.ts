import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Daily Research Sync (spec §15).
 * Pulls the newest metadata for a handful of core biology topics from
 * PubMed / PMC / Elsevier. Each source logs its own success/failure row, so a
 * failing provider never blocks the others.
 */
crons.interval(
  "daily research sync",
  { hours: 24 },
  internal.researchIngest.syncResearchBatch,
  {},
);

export default crons;
