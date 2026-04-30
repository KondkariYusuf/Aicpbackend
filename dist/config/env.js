"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
const nodeEnv = process.env.NODE_ENV ?? "development";
const preferredEnvFile = `.env.${nodeEnv}`;
dotenv_1.default.config({ path: preferredEnvFile });
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().int().positive().default(8080),
    LOG_LEVEL: zod_1.z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(20),
    SUPABASE_PUBLISHABLE_DEFAULT_KEY: zod_1.z.string().min(20),
    SUPABASE_STORAGE_BUCKET: zod_1.z.string().min(1).default("compliance-docs"),
    REDIS_URL: zod_1.z.string().min(1),
    CORS_ORIGIN: zod_1.z.string().url().optional(),
    WEBHOOK_SHARED_SECRET: zod_1.z.string().min(16).optional(),
    WHATSAPP_PHONE_ID: zod_1.z.string().optional(),
    WHATSAPP_API_TOKEN: zod_1.z.string().optional(),
    // SMTP (Email notifications)
    EMAIL_SMTP_HOST: zod_1.z.string().optional(),
    EMAIL_SMTP_PORT: zod_1.z.coerce.number().int().positive().default(587),
    EMAIL_SMTP_USER: zod_1.z.string().optional(),
    EMAIL_SMTP_PASS: zod_1.z.string().optional(),
    EMAIL_FROM_ADDRESS: zod_1.z.string().email().optional()
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const formatted = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
    throw new Error(`Invalid environment configuration: ${formatted}`);
}
exports.env = parsed.data;
