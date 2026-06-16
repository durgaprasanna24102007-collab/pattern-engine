import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const loginLogsTable = pgTable("login_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  ipAddress: text("ip_address").notNull().default("127.0.0.1"),
  location: text("location").notNull().default("Unknown"),
  deviceInfo: text("device_info").notNull().default("Unknown"),
  status: text("status").notNull().default("success"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLoginLogSchema = createInsertSchema(loginLogsTable).omit({ id: true });
export type InsertLoginLog = z.infer<typeof insertLoginLogSchema>;
export type LoginLog = typeof loginLogsTable.$inferSelect;
