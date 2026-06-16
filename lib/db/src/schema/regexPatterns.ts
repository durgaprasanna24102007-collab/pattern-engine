import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const regexPatternsTable = pgTable("regex_patterns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  pattern: text("pattern").notNull(),
  category: text("category").notNull().default("Custom"),
  type: text("type").notNull().default("Standard"),
  severity: text("severity").notNull().default("Medium"),
  iconName: text("icon_name").notNull().default("custom"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRegexPatternSchema = createInsertSchema(regexPatternsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRegexPattern = z.infer<typeof insertRegexPatternSchema>;
export type RegexPattern = typeof regexPatternsTable.$inferSelect;
