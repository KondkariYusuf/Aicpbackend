"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmUploadSchema = exports.reviewRenewalSchema = exports.generateUploadUrlSchema = exports.allowedMimeTypes = void 0;
const zod_1 = require("zod");
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
exports.allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
exports.generateUploadUrlSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1).max(255),
    fileType: zod_1.z.enum(exports.allowedMimeTypes),
    fileSize: zod_1.z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES)
});
exports.reviewRenewalSchema = zod_1.z.object({
    action: zod_1.z.enum(["approve", "reject"]),
    feedback: zod_1.z.string().optional()
});
exports.confirmUploadSchema = zod_1.z.object({
    documentId: zod_1.z.string().uuid(),
    documentName: zod_1.z.string().min(1),
    category: zod_1.z.string().min(1),
    responsiblePerson: zod_1.z.string().min(1),
    expiryDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    securePath: zod_1.z.string().min(1)
});
