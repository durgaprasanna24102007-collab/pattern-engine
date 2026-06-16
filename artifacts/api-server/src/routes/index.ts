import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import patternsRouter from "./patterns";
import scannerRouter from "./scanner";
import alertsRouter from "./alertsRoute";
import logsRouter from "./logs";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(patternsRouter);
router.use(scannerRouter);
router.use(alertsRouter);
router.use(logsRouter);
router.use(dashboardRouter);

export default router;
