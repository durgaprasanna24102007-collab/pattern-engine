import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const scanLogsTable = pgTable("scan_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull().default("text"),
  fileSize: text("file_size").notNull().default("0 KB"),
  scannedText: text("scanned_text"),
  threatsFound: integer("threats_found").notNull().default(0),
  status: text("status").notNull().default("done"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScanLogSchema = createInsertSchema(scanLogsTable).omit({ id: true, createdAt: true });
export type InsertScanLog = z.infer<typeof insertScanLogSchema>;
export type ScanLog = typeof scanLogsTable.$inferSelect;
