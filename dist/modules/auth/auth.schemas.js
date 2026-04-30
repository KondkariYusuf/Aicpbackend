"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.signupSchema = void 0;
const zod_1 = require("zod");
exports.signupSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
    fullName: zod_1.z.string().min(2).max(120),
    instituteId: zod_1.z.string().uuid(),
    role: zod_1.z.enum(["Clerk", "HOD", "Principal"]),
    phoneNumber: zod_1.z.string().min(10).max(15).optional()
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128)
});
