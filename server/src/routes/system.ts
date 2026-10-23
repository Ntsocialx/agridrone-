import { Router } from "express";

export const systemRouter = Router();

systemRouter.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

systemRouter.get("/ready", (_request, response) => {
  response.status(503).json({ status: "not_ready" });
});
