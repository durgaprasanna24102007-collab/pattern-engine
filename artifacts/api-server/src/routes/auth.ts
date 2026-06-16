import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  otpRequestsTable,
  loginLogsTable,
  activityLogsTable,
} from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  generateOtp,
  hashOtp,
  verifyOtp,
  generateToken,
  signJwt,
  validatePassword,
  OTP_COOLDOWN_MS,
  OTP_VALIDITY_MS,
  MAX_FAILED_LOGINS,
  LOCKOUT_MS,
  MAX_OTP_ATTEMPTS,
} from "../lib/auth";
import { captureEmail, getEmails } from "../lib/mailCatcher";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function sendOtpEmail(to: string, otp: string, purpose: string): Promise<void> {
  const purposeLabels: Record<string, string> = {
    signup: "account verification",
    login_2fa: "login verification",
    forgot_password: "password reset",
  };
  const label = purposeLabels[purpose] ?? "verification";
  const subject = `Your OTP for ${label}`;
  const body = `Your one-time password is: ${otp}\n\nThis code expires in 10 minutes.`;
  captureEmail(to, subject, body, otp);
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ message: "Passwords do not match" });
    return;
  }

  const { valid, failedRules } = validatePassword(password);
  if (!valid) {
    res.status(400).json({ message: "Password does not meet requirements", failedRules });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing) {
    res.status(409).json({ message: "Email already registered" });
    return;
  }

  const passwordHash = hashPassword(password);
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const otpExpiry = new Date(Date.now() + OTP_VALIDITY_MS);

  await db.insert(usersTable).values({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role: "user",
    verified: false,
    otpHash,
    otpPurpose: "signup",
    otpExpiry,
    otpAttempts: 0,
  });

  await sendOtpEmail(email, otp, "signup");

  res.status(201).json({
    message: "Account created. Please verify your email with the OTP sent.",
    email: email.toLowerCase(),
    purpose: "signup",
    requiresValidation: true,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));

  const ip = req.ip ?? "unknown";
  const device = req.headers["user-agent"] ?? "Unknown";

  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const remaining = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
    res.status(403).json({
      message: `Account locked. Try again in ${remaining} minute(s).`,
      purpose: "locked",
    });
    return;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    const newFailed = user.failedLoginAttempts + 1;
    const lockoutUntil = newFailed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MS) : null;

    await db.update(usersTable).set({
      failedLoginAttempts: newFailed,
      lockoutUntil: lockoutUntil ?? undefined,
    }).where(eq(usersTable.id, user.id));

    await db.insert(loginLogsTable).values({
      userId: user.id,
      ipAddress: ip,
      location: "Unknown",
      deviceInfo: device,
      status: "failed",
    });

    if (newFailed >= MAX_FAILED_LOGINS) {
      res.status(403).json({ message: "Too many failed attempts. Account locked for 15 minutes.", purpose: "locked" });
      return;
    }

    res.status(401).json({ message: `Invalid password. ${MAX_FAILED_LOGINS - newFailed} attempt(s) remaining.` });
    return;
  }

  if (!user.verified) {
    const otp = generateOtp();
    await db.update(usersTable).set({
      otpHash: hashOtp(otp),
      otpPurpose: "signup",
      otpExpiry: new Date(Date.now() + OTP_VALIDITY_MS),
      otpAttempts: 0,
    }).where(eq(usersTable.id, user.id));
    await sendOtpEmail(user.email, otp, "signup");
    res.status(403).json({
      message: "Email not verified. A new OTP has been sent.",
      email: user.email,
      purpose: "signup",
      requiresValidation: true,
    });
    return;
  }

  const otp = generateOtp();
  await db.update(usersTable).set({
    failedLoginAttempts: 0,
    lockoutUntil: null,
    otpHash: hashOtp(otp),
    otpPurpose: "login_2fa",
    otpExpiry: new Date(Date.now() + OTP_VALIDITY_MS),
    otpAttempts: 0,
  }).where(eq(usersTable.id, user.id));

  await sendOtpEmail(user.email, otp, "login_2fa");

  res.json({
    message: "OTP sent. Please verify your identity.",
    email: user.email,
    purpose: "login_2fa",
    requiresValidation: true,
  });
});

router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const { email, otp, purpose } = req.body;

  if (!email || !otp || !purpose) {
    res.status(400).json({ message: "Email, OTP, and purpose are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(400).json({ message: "User not found" });
    return;
  }

  if (user.otpPurpose !== purpose) {
    res.status(400).json({ message: "OTP purpose mismatch" });
    return;
  }

  if (!user.otpHash || !user.otpExpiry || user.otpExpiry < new Date()) {
    res.status(400).json({ message: "OTP has expired. Please request a new one." });
    return;
  }

  if ((user.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    res.status(400).json({ message: "Too many OTP attempts. Please request a new OTP." });
    return;
  }

  if (!verifyOtp(otp, user.otpHash)) {
    await db.update(usersTable).set({ otpAttempts: (user.otpAttempts ?? 0) + 1 }).where(eq(usersTable.id, user.id));
    const remaining = MAX_OTP_ATTEMPTS - ((user.otpAttempts ?? 0) + 1);
    res.status(400).json({ message: `Invalid OTP. ${remaining} attempt(s) remaining.` });
    return;
  }

  await db.update(usersTable).set({
    otpHash: null,
    otpPurpose: null,
    otpExpiry: null,
    otpAttempts: 0,
  }).where(eq(usersTable.id, user.id));

  if (purpose === "signup") {
    await db.update(usersTable).set({ verified: true }).where(eq(usersTable.id, user.id));
    const token = signJwt({ userId: user.id, email: user.email, name: user.name, role: user.role });
    await db.insert(activityLogsTable).values({
      userId: user.id,
      level: "success",
      message: `User ${user.name} signed up and verified email`,
    });
    res.json({ message: "Email verified. Welcome!", token, user: { id: user.id, name: user.name, email: user.email } });
    return;
  }

  if (purpose === "login_2fa") {
    const token = signJwt({ userId: user.id, email: user.email, name: user.name, role: user.role });
    await db.insert(loginLogsTable).values({
      userId: user.id,
      ipAddress: req.ip ?? "unknown",
      location: "Unknown",
      deviceInfo: req.headers["user-agent"] ?? "Unknown",
      status: "success",
    });
    await db.insert(activityLogsTable).values({
      userId: user.id,
      level: "info",
      message: `User ${user.name} logged in`,
    });
    res.json({ message: "Login successful!", token, user: { id: user.id, name: user.name, email: user.email } });
    return;
  }

  if (purpose === "forgot_password") {
    const resetPermitToken = generateToken();
    await db.update(usersTable).set({ resetPermitToken }).where(eq(usersTable.id, user.id));
    res.json({ message: "OTP verified. You may now reset your password.", resetPermitToken });
    return;
  }

  res.status(400).json({ message: "Unknown OTP purpose" });
});

router.post("/auth/resend-otp", async (req, res): Promise<void> => {
  const { email, purpose } = req.body;

  if (!email || !purpose) {
    res.status(400).json({ message: "Email and purpose are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(200).json({ message: "If that email is registered, a new OTP has been sent.", cooldown: 60 });
    return;
  }

  const since = new Date(Date.now() - OTP_COOLDOWN_MS);
  const [recent] = await db.select().from(otpRequestsTable)
    .where(and(eq(otpRequestsTable.userId, user.id), gte(otpRequestsTable.requestedAt, since)));

  if (recent) {
    const cooldown = Math.ceil((recent.requestedAt.getTime() + OTP_COOLDOWN_MS - Date.now()) / 1000);
    res.status(429).json({ message: `Please wait ${cooldown} second(s) before requesting another OTP.` });
    return;
  }

  await db.insert(otpRequestsTable).values({ userId: user.id });

  const otp = generateOtp();
  await db.update(usersTable).set({
    otpHash: hashOtp(otp),
    otpPurpose: purpose,
    otpExpiry: new Date(Date.now() + OTP_VALIDITY_MS),
    otpAttempts: 0,
  }).where(eq(usersTable.id, user.id));

  await sendOtpEmail(user.email, otp, purpose);
  res.json({ message: "OTP resent successfully.", cooldown: 60 });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email is required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(200).json({ message: "If that email is registered, an OTP has been sent.", email, requiresValidation: true });
    return;
  }

  const otp = generateOtp();
  await db.update(usersTable).set({
    otpHash: hashOtp(otp),
    otpPurpose: "forgot_password",
    otpExpiry: new Date(Date.now() + OTP_VALIDITY_MS),
    otpAttempts: 0,
  }).where(eq(usersTable.id, user.id));

  await sendOtpEmail(user.email, otp, "forgot_password");
  res.json({ message: "OTP sent to your email.", email: user.email, requiresValidation: true });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { email, resetPermitToken, newPassword, confirmPassword } = req.body;

  if (!email || !resetPermitToken || !newPassword || !confirmPassword) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ message: "Passwords do not match" });
    return;
  }

  const { valid, failedRules } = validatePassword(newPassword);
  if (!valid) {
    res.status(400).json({ message: "Password does not meet requirements", failedRules });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user || user.resetPermitToken !== resetPermitToken) {
    res.status(403).json({ message: "Invalid or expired reset token" });
    return;
  }

  await db.update(usersTable).set({
    passwordHash: hashPassword(newPassword),
    resetPermitToken: null,
    failedLoginAttempts: 0,
    lockoutUntil: null,
  }).where(eq(usersTable.id, user.id));

  await db.insert(activityLogsTable).values({
    userId: user.id,
    level: "warning",
    message: `User ${user.name} reset their password`,
  });

  res.json({ message: "Password reset successfully. You may now log in." });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ message: "User not found" });
    return;
  }
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, verified: user.verified } });
});

router.get("/auth/mail-catcher", async (_req, res): Promise<void> => {
  const emails = getEmails();
  res.json({ emails });
});

export default router;
