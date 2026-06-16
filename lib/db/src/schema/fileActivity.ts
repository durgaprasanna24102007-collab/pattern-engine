import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const fileActivityTable = pgTable("file_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  fileName: text("file_name").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFileActivitySchema = createInsertSchema(fileActivityTable).omit({ id: true });
export type InsertFileActivity = z.infer<typeof insertFileActivitySchema>;
export type FileActivity = typeof fileActivityTable.$inferSelect;
