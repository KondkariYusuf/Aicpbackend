import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/core/middleware/error-handler";

const getUserMock = vi.fn();
const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("../src/config/supabase", () => ({
  supabaseAdmin: {
    auth: {
      getUser: getUserMock
    },
    from: fromMock
  }
}));

const buildApp = async () => {
  const { authenticate } = await import("../src/core/middleware/auth");

  const app = express();
  app.get("/secure", authenticate, (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        userId: req.auth?.user.id,
        role: req.auth?.profile.role
      }
    });
  });
  app.use(errorHandler);

  return app;
};

describe("authenticate middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for missing bearer token", async () => {
    const app = await buildApp();
    const response = await request(app).get("/secure");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Missing or invalid Authorization header");
  });

  it("returns 401 when Supabase token validation fails", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "invalid jwt" } });

    const app = await buildApp();
    const response = await request(app)
      .get("/secure")
      .set("Authorization", "Bearer bad-token");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("attaches user auth context for valid token", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "f08ea4f6-7a17-4525-9322-2fd7bb37a1ef" } },
      error: null
    });
    maybeSingleMock.mockResolvedValue({
      data: {
        id: "f08ea4f6-7a17-4525-9322-2fd7bb37a1ef",
        institute_id: "f4ba26b7-b5ed-4f7e-8f4e-ff5782a0ca08",
        role: "Clerk",
        full_name: "Test User"
      },
      error: null
    });

    const app = await buildApp();
    const response = await request(app)
      .get("/secure")
      .set("Authorization", "Bearer good-token");

    expect(response.status).toBe(200);
    expect(response.body.data.userId).toBe("f08ea4f6-7a17-4525-9322-2fd7bb37a1ef");
    expect(response.body.data.role).toBe("Clerk");
  });
});
