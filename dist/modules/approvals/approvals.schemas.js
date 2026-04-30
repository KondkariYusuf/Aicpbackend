"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitApprovalSchema = void 0;
const zod_1 = require("zod");
exports.submitApprovalSchema = zod_1.z.object({
    documentId: zod_1.z.string().uuid(),
    feedback: zod_1.z.string().min(1).max(2000),
    action: zod_1.z.enum(["feedback", "approve", "reject"])
});
