"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUploadUrlSchema = exports.allowedMimeTypes = void 0;
const zod_1 = require("zod");
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
exports.allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
exports.generateUploadUrlSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1).max(255),
    fileType: zod_1.z.enum(exports.allowedMimeTypes),
    fileSize: zod_1.z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES)
});
