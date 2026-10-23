import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./app";

describe("system routes", () => {
  it("reports process liveness", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("does not claim readiness before dependency checks exist", async () => {
    const response = await request(app).get("/api/v1/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "not_ready" });
  });

  it("returns a safe not-found response", async () => {
    const response = await request(app).get("/missing");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
      },
    });
  });
});
