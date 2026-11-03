import type { ErrorRequestHandler } from "express";
import { HttpError } from "../http";

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  // express.json() rejects malformed bodies with a 400 SyntaxError.
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    response.status(400).json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON." } });
    return;
  }

  console.error(
    JSON.stringify({
      event: "request_error",
      method: request.method,
      path: request.path,
      errorType: error instanceof Error ? error.name : "unknown",
    }),
  );

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
};
