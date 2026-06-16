import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  fileName: text("file_name").notNull(),
  patternName: text("pattern_name").notNull(),
  severity: text("severity").notNull().default("Medium"),
  hits: integer("hits").notNull().default(1),
  status: text("status").notNull().default("Unresolved"),
  channel: text("channel").notNull().default("Uploaded File"),
  snippet: text("snippet").notNull().default(""),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
