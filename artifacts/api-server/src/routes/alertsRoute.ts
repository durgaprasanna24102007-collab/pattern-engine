import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/alerts", requireAuth, async (_req, res): Promise<void> => {
  const alerts = await db.select().from(alertsTable).orderBy(alertsTable.createdAt);
  res.json({ alerts });
});

router.patch("/alerts/:id/acknowledge", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: "Invalid alert ID" });
    return;
  }

  const [updated] = await db.update(alertsTable).set({
    status: "Acknowledged",
    isResolved: true,
  }).where(eq(alertsTable.id, id)).returning();

  if (!updated) {
    res.status(404).json({ message: "Alert not found" });
    return;
  }
  res.json({ alert: updated });
});

router.delete("/alerts/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: "Invalid alert ID" });
    return;
  }

  const [deleted] = await db.delete(alertsTable).where(eq(alertsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ message: "Alert not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
