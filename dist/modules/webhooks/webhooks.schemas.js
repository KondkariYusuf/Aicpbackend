"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageObjectCreatedSchema = void 0;
const zod_1 = require("zod");
exports.storageObjectCreatedSchema = zod_1.z.object({
    event: zod_1.z.literal("OBJECT_CREATED"),
    bucket: zod_1.z.string().min(1),
    key: zod_1.z.string().min(1),
    size: zod_1.z.number().int().nonnegative(),
    mimeType: zod_1.z.string().min(1).optional(),
    createdAt: zod_1.z.string().datetime()
});
