import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../lib/auth";

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  userName?: string;
  userRole?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyJwt(token);
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
  req.userId = payload.userId;
  req.userEmail = payload.email;
  req.userName = payload.name;
  req.userRole = payload.role;
  next();
}
