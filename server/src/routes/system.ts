import { Router } from "express";
import type { Db } from "../db";

export function systemRouter(db: Db) {
  const router = Router();

  router.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  router.get("/ready", async (_request, response) => {
    try {
      await db.query("SELECT 1");
      response.status(200).json({ status: "ready" });
    } catch {
      response.status(503).json({ status: "not_ready" });
    }
  });

  return router;
}
