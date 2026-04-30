import { describe, expect, it } from "vitest";
import { generateUploadUrlSchema } from "../src/modules/documents/documents.schemas";

describe("generateUploadUrlSchema", () => {
  it("accepts valid document metadata", () => {
    const parsed = generateUploadUrlSchema.parse({
      filename: "noc-approval.pdf",
      fileType: "application/pdf",
      fileSize: 1024
    });

    expect(parsed.filename).toBe("noc-approval.pdf");
  });

  it("rejects files above 10MB", () => {
    expect(() =>
      generateUploadUrlSchema.parse({
        filename: "big.pdf",
        fileType: "application/pdf",
        fileSize: 10 * 1024 * 1024 + 1
      })
    ).toThrowError();
  });

  it("rejects unsupported file types", () => {
    expect(() =>
      generateUploadUrlSchema.parse({
        filename: "malware.exe",
        fileType: "application/x-msdownload",
        fileSize: 1234
      })
    ).toThrowError();
  });
});
