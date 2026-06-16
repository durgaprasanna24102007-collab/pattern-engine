import crypto from "crypto";
import { logger } from "./logger";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
const OTP_VALIDITY_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

export { OTP_COOLDOWN_MS, MAX_FAILED_LOGINS, LOCKOUT_MS, OTP_VALIDITY_MS, MAX_OTP_ATTEMPTS };

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + JWT_SECRET).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function verifyOtp(otp: string, hash: string): boolean {
  return hashOtp(otp) === hash;
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export interface JwtPayload {
  userId: number;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

function base64url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(input: string): string {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

export function signJwt(payload: Omit<JwtPayload, "iat" | "exp">, expiresInSeconds = 86400): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds }));
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    if (sig !== expected) return null;
    const payload: JwtPayload = JSON.parse(base64urlDecode(body));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (err) {
    logger.warn({ err }, "JWT verification failed");
    return null;
  }
}

export function validatePassword(password: string): { valid: boolean; failedRules: string[] } {
  const failedRules: string[] = [];
  if (password.length < 8) failedRules.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) failedRules.push("At least one uppercase letter");
  if (!/[a-z]/.test(password)) failedRules.push("At least one lowercase letter");
  if (!/[0-9]/.test(password)) failedRules.push("At least one number");
  if (!/[^A-Za-z0-9]/.test(password)) failedRules.push("At least one special character");
  return { valid: failedRules.length === 0, failedRules };
}
