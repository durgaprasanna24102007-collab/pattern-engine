import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { regexPatternsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

const DEFAULT_PATTERNS = [
  { name: "Email Address", pattern: "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}", category: "PII", type: "Standard", severity: "Medium", iconName: "alternate_email", isActive: true },
  { name: "Credit Card", pattern: "\\b(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11})\\b", category: "Financial", type: "Standard", severity: "Critical", iconName: "credit_card", isActive: true },
  { name: "Aadhaar ID", pattern: "\\b[2-9]{1}[0-9]{3}\\s[0-9]{4}\\s[0-9]{4}\\b", category: "PII", type: "Standard", severity: "High", iconName: "badge", isActive: true },
  { name: "API Key", pattern: "(?i)(api[_\\-]?key|apikey|secret[_\\-]?key)\\s*[:=]\\s*['\"]?([A-Za-z0-9_\\-]{20,})['\"]?", category: "Credentials", type: "Standard", severity: "Critical", iconName: "vpn_key", isActive: true },
  { name: "Phone Number", pattern: "\\b(?:\\+?91[\\s\\-]?)?[6-9]\\d{9}\\b", category: "PII", type: "Standard", severity: "Low", iconName: "phone", isActive: true },
];

async function seedDefaultPatterns(): Promise<void> {
  const existing = await db.select().from(regexPatternsTable);
  if (existing.length === 0) {
    await db.insert(regexPatternsTable).values(DEFAULT_PATTERNS);
  }
}

seedDefaultPatterns().catch(() => {});

router.get("/patterns", requireAuth, async (_req, res): Promise<void> => {
  const patterns = await db.select().from(regexPatternsTable).orderBy(regexPatternsTable.createdAt);
  res.json({ patterns });
});

router.post("/patterns", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, pattern, category, type, severity, iconName } = req.body;

  if (!name || !pattern || !category || !severity) {
    res.status(400).json({ message: "name, pattern, category, and severity are required" });
    return;
  }

  try {
    new RegExp(pattern);
  } catch {
    res.status(400).json({ message: "Invalid regular expression" });
    return;
  }

  const [created] = await db.insert(regexPatternsTable).values({
    name,
    pattern,
    category,
    type: type ?? "Custom",
    severity,
    iconName: iconName ?? "custom",
    isActive: true,
    createdBy: req.userId,
  }).returning();

  res.status(201).json({ pattern: created });
});

router.patch("/patterns/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: "Invalid pattern ID" });
    return;
  }

  const { isActive, name, pattern, category, severity } = req.body;
  const updates: Partial<typeof regexPatternsTable.$inferInsert> = {};

  if (typeof isActive === "boolean") updates.isActive = isActive;
  if (name) updates.name = name;
  if (pattern) {
    try { new RegExp(pattern); } catch { res.status(400).json({ message: "Invalid regular expression" }); return; }
    updates.pattern = pattern;
  }
  if (category) updates.category = category;
  if (severity) updates.severity = severity;

  const [updated] = await db.update(regexPatternsTable).set(updates).where(eq(regexPatternsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ message: "Pattern not found" });
    return;
  }
  res.json({ pattern: updated });
});

router.delete("/patterns/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: "Invalid pattern ID" });
    return;
  }

  const [deleted] = await db.delete(regexPatternsTable).where(eq(regexPatternsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ message: "Pattern not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
