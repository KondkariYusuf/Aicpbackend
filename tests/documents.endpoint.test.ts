import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/core/middleware/error-handler";

let currentRole: "Clerk" | "Staff" | "Principal" | "Institute Authority" = "Clerk";

vi.mock("../src/core/middleware/auth", () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.auth = {
      token: "mock-token",
      user: { id: "93f45373-a5db-4f7e-88dc-3f4cf1d2816c" } as never,
      profile: {
        id: "93f45373-a5db-4f7e-88dc-3f4cf1d2816c",
        institute_id: "501179df-68ab-4a7d-8bd8-e36d8f60af8f",
        role: currentRole,
        full_name: "Mock User"
      }
    };
    next();
  }
}));

const generateUploadUrlMock = vi.fn();

vi.mock("../src/modules/documents/documents.service", () => ({
  documentService: {
    generateUploadUrl: generateUploadUrlMock
  }
}));

const buildApp = async () => {
  const { documentsRoutes } = await import("../src/modules/documents/documents.routes");

  const app = express();
  app.use(express.json());
  app.use("/api/documents", documentsRoutes);
  app.use(errorHandler);

  return app;
};

describe("POST /api/documents/generate-upload-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentRole = "Clerk";
  });

  it("returns signed upload URL for Clerk", async () => {
    generateUploadUrlMock.mockResolvedValue({
      documentId: "de3e6e4d-4776-4fa6-8a54-a7e4b7eb688f",
      uploadUrl: "https://signed-url.example/upload",
      securePath: "inst/doc/file.pdf"
    });

    const app = await buildApp();

    const response = await request(app).post("/api/documents/generate-upload-url").send({
      filename: "compliance.pdf",
      fileType: "application/pdf",
      fileSize: 1200
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(generateUploadUrlMock).toHaveBeenCalledTimes(1);
  });

  it("blocks non-Clerk roles", async () => {
    currentRole = "Staff";

    const app = await buildApp();

    const response = await request(app).post("/api/documents/generate-upload-url").send({
      filename: "compliance.pdf",
      fileType: "application/pdf",
      fileSize: 1200
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Forbidden");
  });

  it("returns 400 for invalid upload metadata", async () => {
    const app = await buildApp();

    const response = await request(app).post("/api/documents/generate-upload-url").send({
      filename: "bad.exe",
      fileType: "application/x-msdownload",
      fileSize: 1200
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
  });
});
