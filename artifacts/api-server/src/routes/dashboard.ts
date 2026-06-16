import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { alertsTable, scanLogsTable, regexPatternsTable, activityLogsTable, loginLogsTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const [[scansRow], [alertsRow], [patternsRow], [logsRow]] = await Promise.all([
    db.select({ count: count() }).from(scanLogsTable),
    db.select({ count: count() }).from(alertsTable),
    db.select({ count: count() }).from(regexPatternsTable),
    db.select({ count: count() }).from(activityLogsTable),
  ]);

  const recentAlerts = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt)).limit(5);
  const recentLogs = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.timestamp)).limit(5);

  const allAlerts = await db.select().from(alertsTable);
  const severityCounts: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  for (const a of allAlerts) {
    const s = a.severity;
    if (s in severityCounts) severityCounts[s]++;
  }

  const unresolvedCount = allAlerts.filter((a) => a.status === "Unresolved").length;

  res.json({
    filesScannedCount: Number(scansRow?.count ?? 0),
    alertsCount: Number(alertsRow?.count ?? 0),
    patternsCount: Number(patternsRow?.count ?? 0),
    logsCount: Number(logsRow?.count ?? 0),
    unresolvedAlertsCount: unresolvedCount,
    severityDistribution: severityCounts,
    recentAlerts,
    recentLogs,
  });
});

router.get("/login-logs", requireAuth, async (_req, res): Promise<void> => {
  const logs = await db.select().from(loginLogsTable).orderBy(desc(loginLogsTable.timestamp)).limit(100);
  res.json({ logs });
});

export default router;
