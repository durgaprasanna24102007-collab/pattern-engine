import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const otpRequestsTable = pgTable("otp_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOtpRequestSchema = createInsertSchema(otpRequestsTable).omit({ id: true });
export type InsertOtpRequest = z.infer<typeof insertOtpRequestSchema>;
export type OtpRequest = typeof otpRequestsTable.$inferSelect;
