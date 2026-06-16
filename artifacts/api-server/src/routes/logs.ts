import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { activityLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/logs", requireAuth, async (_req, res): Promise<void> => {
  const logs = await db.select().from(activityLogsTable)
    .orderBy(activityLogsTable.timestamp)
    .limit(500);
  res.json({ logs });
});

router.delete("/logs", requireAuth, async (_req, res): Promise<void> => {
  await db.delete(activityLogsTable);
  res.json({ message: "All logs cleared" });
});

router.post("/logs", requireAuth, async (req, res): Promise<void> => {
  const { level, message, details } = req.body;
  if (!level || !message) {
    res.status(400).json({ message: "level and message are required" });
    return;
  }
  const [log] = await db.insert(activityLogsTable).values({ level, message, details }).returning();
  res.status(201).json({ log });
});

export default router;
