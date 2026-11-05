import cors from "cors";
import express from "express";
import helmet from "helmet";
import { requireAuth } from "./auth";
import { corsOrigins } from "./config/env";
import type { Db } from "./db";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./routes/auth";
import { jobsRouter } from "./routes/jobs";
import { meRouter } from "./routes/me";
import { adminRouter, operatorsRouter } from "./routes/operators";
import { reviewsAdminRouter, reviewsRouter } from "./routes/reviews";
import { systemRouter } from "./routes/system";
import { licenceAdminRouter, uploadsRouter } from "./routes/uploads";
import type { Mailer } from "./mailer";
import type { Storage } from "./storage";

export type AppDeps = { db: Db; storage: Storage; mailer?: Mailer | null; jwtSecret: string; authRateLimit?: number };

export function createApp({ db, storage, mailer = null, jwtSecret, authRateLimit }: AppDeps) {
  const app = express();

  app.disable("x-powered-by");
  // Render sits behind one proxy; needed so rate limits key on the real client IP.
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, origin === undefined || corsOrigins.has(origin));
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  const authed = requireAuth(db, jwtSecret);
  app.use("/api/v1", systemRouter(db));
  app.use("/api/v1/auth", authRouter(db, jwtSecret, mailer, authRateLimit));
  app.use("/api/v1/me", authed, meRouter(db, authRateLimit));
  app.use("/api/v1/jobs", authed, jobsRouter(db));
  app.use("/api/v1/operators", authed, operatorsRouter(db));
  app.use("/api/v1/operators", authed, uploadsRouter(db, storage));
  app.use("/api/v1/admin", authed, adminRouter(db));
  app.use("/api/v1/admin", authed, licenceAdminRouter(db, storage));
  app.use("/api/v1/admin/reviews", authed, reviewsAdminRouter(db));
  app.use("/api/v1", authed, reviewsRouter(db));

  app.use((_request, response) => {
    response.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
      },
    });
  });
  app.use(errorHandler);

  return app;
}
