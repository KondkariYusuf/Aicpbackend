"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const documents_schemas_1 = require("../src/modules/documents/documents.schemas");
(0, vitest_1.describe)("generateUploadUrlSchema", () => {
    (0, vitest_1.it)("accepts valid document metadata", () => {
        const parsed = documents_schemas_1.generateUploadUrlSchema.parse({
            filename: "noc-approval.pdf",
            fileType: "application/pdf",
            fileSize: 1024
        });
        (0, vitest_1.expect)(parsed.filename).toBe("noc-approval.pdf");
    });
    (0, vitest_1.it)("rejects files above 10MB", () => {
        (0, vitest_1.expect)(() => documents_schemas_1.generateUploadUrlSchema.parse({
            filename: "big.pdf",
            fileType: "application/pdf",
            fileSize: 10 * 1024 * 1024 + 1
        })).toThrowError();
    });
    (0, vitest_1.it)("rejects unsupported file types", () => {
        (0, vitest_1.expect)(() => documents_schemas_1.generateUploadUrlSchema.parse({
            filename: "malware.exe",
            fileType: "application/x-msdownload",
            fileSize: 1234
        })).toThrowError();
    });
});
