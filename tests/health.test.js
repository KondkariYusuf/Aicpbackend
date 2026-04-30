"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
(0, vitest_1.beforeAll)(() => {
    process.env.NODE_ENV = "test";
    process.env.PORT = "8080";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key-with-minimum-length";
    process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY = "test-publishable-key-with-minimum-length";
    process.env.SUPABASE_STORAGE_BUCKET = "compliance-docs";
    process.env.REDIS_URL = "redis://127.0.0.1:6379";
});
(0, vitest_1.describe)("GET /api/health", () => {
    (0, vitest_1.it)("returns service health", async () => {
        const { app } = await Promise.resolve().then(() => __importStar(require("../src/app")));
        const response = await (0, supertest_1.default)(app).get("/api/health");
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.status).toBe("ok");
    });
});
