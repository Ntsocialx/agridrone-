import type { ErrorRequestHandler } from "express";

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
