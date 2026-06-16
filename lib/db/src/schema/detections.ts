import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scanLogsTable } from "./scanLogs";
import { regexPatternsTable } from "./regexPatterns";

export const detectionsTable = pgTable("detections", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id").references(() => scanLogsTable.id, { onDelete: "cascade" }),
  patternId: integer("pattern_id").references(() => regexPatternsTable.id),
  patternName: text("pattern_name").notNull(),
  matchedText: text("matched_text").notNull(),
  maskedText: text("masked_text"),
  lineNumber: integer("line_number"),
  severity: text("severity").notNull().default("Medium"),
  channel: text("channel").notNull().default("Uploaded File"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDetectionSchema = createInsertSchema(detectionsTable).omit({ id: true, createdAt: true });
export type InsertDetection = z.infer<typeof insertDetectionSchema>;
export type Detection = typeof detectionsTable.$inferSelect;
