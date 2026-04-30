"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentService = void 0;
const node_crypto_1 = require("node:crypto");
const env_1 = require("../../config/env");
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../core/errors/AppError");
const sanitizeFilename = (filename) => {
    return filename.replace(/[^a-zA-Z0-9_.-]/g, "-");
};
exports.documentService = {
    /**
     * @security ⚠️  RLS BYPASS WARNING ⚠️
     *
     * This function uses `supabaseAdmin` (service-role key) to generate
     * a signed upload URL. The service-role key **completely bypasses**
     * PostgreSQL Row Level Security (RLS).
     *
     * This means:
     *  - The storage operation is NOT subject to any RLS policies.
     *  - There is NO automatic authorization check at the database level.
     *
     * ⛔  Any route that calls this service MUST:
     *  1. Authenticate the user via the `authenticate` middleware.
     *  2. Authorize the user's role via the `authorizeRoles` middleware.
     *  3. Validate the request payload via Zod schemas in the controller.
     *
     * Never expose this function to unauthenticated or unauthorized callers.
     */
    generateUploadUrl: async (payload, instituteId) => {
        if (!instituteId) {
            throw new AppError_1.AppError("Authenticated user has no institute mapping", 403);
        }
        const documentId = (0, node_crypto_1.randomUUID)();
        const safeFilename = sanitizeFilename(payload.filename);
        const securePath = `${instituteId}/${documentId}/${safeFilename}`;
        const { data, error } = await supabase_1.supabaseAdmin
            .storage
            .from(env_1.env.SUPABASE_STORAGE_BUCKET)
            .createSignedUploadUrl(securePath);
        if (error || !data) {
            throw new AppError_1.AppError("Failed to generate signed upload URL", 500, error?.message);
        }
        return {
            documentId,
            uploadUrl: data.signedUrl,
            securePath
        };
    }
};
