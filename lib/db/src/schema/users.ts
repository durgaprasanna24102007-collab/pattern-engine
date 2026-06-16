import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  verified: boolean("verified").notNull().default(false),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockoutUntil: timestamp("lockout_until", { withTimezone: true }),
  otpHash: text("otp_hash"),
  otpPurpose: text("otp_purpose"),
  otpExpiry: timestamp("otp_expiry", { withTimezone: true }),
  otpAttempts: integer("otp_attempts").notNull().default(0),
  resetPermitToken: text("reset_permit_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
