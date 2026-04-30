import request from "supertest";
import { describe, expect, it } from "vitest";

describe("GET /api/health", () => {
  it("returns service health", async () => {
    const { app } = await import("../src/app.ts");

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });
});
