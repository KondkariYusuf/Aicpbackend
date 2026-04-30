"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInstituteSchema = void 0;
const zod_1 = require("zod");
exports.createInstituteSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(255),
    code: zod_1.z.string().min(2).max(20).toUpperCase()
});
