import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsOrigins } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { systemRouter } from "./routes/system";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      callback(null, origin === undefined || corsOrigins.has(origin));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use("/api/v1", systemRouter);
app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found.",
    },
  });
});
app.use(errorHandler);

export default app;
