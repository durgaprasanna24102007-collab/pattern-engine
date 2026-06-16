import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { regexPatternsTable, scanLogsTable, detectionsTable, alertsTable, activityLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

function maskText(text: string): string {
  if (text.length <= 4) return "****";
  return text.slice(0, 2) + "*".repeat(text.length - 4) + text.slice(-2);
}

router.post("/scan", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { text, fileName, fileSize } = req.body;

  if (text == null) {
    res.status(400).json({ message: "text is required" });
    return;
  }

  const patterns = await db.select().from(regexPatternsTable).where(eq(regexPatternsTable.isActive, true));

  const [scanLog] = await db.insert(scanLogsTable).values({
    userId: req.userId,
    fileName: fileName ?? "Pasted Text",
    fileType: fileName ? (fileName.split(".").pop() ?? "text") : "text",
    fileSize: fileSize ?? "unknown",
    scannedText: text.slice(0, 5000),
    threatsFound: 0,
    status: "done",
  }).returning();

  const detections: Array<{
    patternName: string;
    matchedText: string;
    maskedText: string;
    severity: string;
    lineNumber: number;
    channel: string;
  }> = [];

  const lines = text.split("\n");
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern.pattern, "gi");
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const matches = [...line.matchAll(regex)];
        for (const match of matches) {
          const matched = match[0];
          detections.push({
            patternName: pattern.name,
            matchedText: matched,
            maskedText: maskText(matched),
            severity: pattern.severity,
            lineNumber: lineIdx + 1,
            channel: fileName ? "Uploaded File" : "Pasted Text",
          });
        }
      }
    } catch {
      // Skip invalid regex
    }
  }

  if (detections.length > 0) {
    await db.insert(detectionsTable).values(
      detections.map((d) => ({
        scanId: scanLog.id,
        patternName: d.patternName,
        matchedText: d.matchedText,
        maskedText: d.maskedText,
        lineNumber: d.lineNumber,
        severity: d.severity,
        channel: d.channel,
      }))
    );

    const byPattern = new Map<string, typeof detections[number][]>();
    for (const d of detections) {
      if (!byPattern.has(d.patternName)) byPattern.set(d.patternName, []);
      byPattern.get(d.patternName)!.push(d);
    }

    for (const [patternName, hits] of byPattern.entries()) {
      await db.insert(alertsTable).values({
        userId: req.userId,
        fileName: fileName ?? "Pasted Text",
        patternName,
        severity: hits[0].severity,
        hits: hits.length,
        status: "Unresolved",
        channel: hits[0].channel,
        snippet: hits[0].maskedText,
      });
    }

    await db.update(scanLogsTable).set({ threatsFound: detections.length }).where(eq(scanLogsTable.id, scanLog.id));
  }

  await db.insert(activityLogsTable).values({
    userId: req.userId,
    level: detections.length > 0 ? "warning" : "info",
    message: `Scanned "${fileName ?? "Pasted Text"}" — ${detections.length} threat(s) found`,
  });

  res.json({
    scanId: scanLog.id,
    fileName: fileName ?? "Pasted Text",
    threatsFound: detections.length,
    detections,
  });
});

router.get("/scan/history", requireAuth, async (_req, res): Promise<void> => {
  const scans = await db.select().from(scanLogsTable).orderBy(desc(scanLogsTable.createdAt)).limit(100);
  res.json({ scans });
});

export default router;
