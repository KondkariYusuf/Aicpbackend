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
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentService = exports.calculateStatusAndFlags = exports.getDaysUntilExpiry = void 0;
const node_crypto_1 = require("node:crypto");
const env_1 = require("../../config/env");
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../core/errors/AppError");
const sanitizeFilename = (filename) => {
    return filename.replace(/[^a-zA-Z0-9_.-]/g, "-");
};
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const startOfUtcDay = (value) => {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
};
const getDaysUntilExpiry = (expiryDateIso, now) => {
    const today = startOfUtcDay(now).getTime();
    const expiry = startOfUtcDay(new Date(expiryDateIso)).getTime();
    return Math.floor((expiry - today) / MS_PER_DAY);
};
exports.getDaysUntilExpiry = getDaysUntilExpiry;
const calculateStatusAndFlags = (expiryDate) => {
    const daysUntilExpiry = (0, exports.getDaysUntilExpiry)(expiryDate, new Date());
    let status = "Valid";
    const flags = { notified_3m: false, notified_2m: false, notified_1m: false, notified_0d: false };
    let milestoneDays = null;
    if (daysUntilExpiry <= 0) {
        status = "Expired";
        flags.notified_0d = true;
        flags.notified_1m = true;
        flags.notified_2m = true;
        flags.notified_3m = true;
        milestoneDays = 0;
    }
    else if (daysUntilExpiry < 30) {
        status = "Near Expiration";
        flags.notified_1m = true;
        flags.notified_2m = true;
        flags.notified_3m = true;
        milestoneDays = 30;
    }
    else if (daysUntilExpiry < 60) {
        status = "Expiring Soon";
        flags.notified_2m = true;
        flags.notified_3m = true;
        milestoneDays = 60;
    }
    else if (daysUntilExpiry <= 90) {
        status = "Valid";
        flags.notified_3m = true;
        milestoneDays = 90;
    }
    return { status, flags, daysUntilExpiry, milestoneDays };
};
exports.calculateStatusAndFlags = calculateStatusAndFlags;
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
    },
    confirmUpload: async (payload, uploaderId, instituteId) => {
        const { status, flags, milestoneDays } = (0, exports.calculateStatusAndFlags)(payload.expiryDate);
        const { error: insertError } = await supabase_1.supabaseAdmin.from("documents").insert({
            id: payload.documentId,
            institute_id: instituteId,
            uploader_id: uploaderId,
            document_name: payload.documentName,
            category: payload.category,
            responsible_person: payload.responsiblePerson,
            expiry_date: payload.expiryDate,
            file_path: payload.securePath,
            status: status,
            ...flags
        });
        if (insertError) {
            throw new AppError_1.AppError("Failed to save document metadata", 500, insertError.message);
        }
        return { status, milestoneDays };
    },
    reviewRenewal: async (renewalId, action, feedback, reviewerId, reviewerRole, reviewerName) => {
        // 1. Fetch the renewal and original doc
        const { data: renewal, error: renewalErr } = await supabase_1.supabaseAdmin
            .from("document_renewals")
            .select("*, documents(*)")
            .eq("id", renewalId)
            .single();
        if (renewalErr || !renewal) {
            throw new AppError_1.AppError("Renewal not found", 404);
        }
        if (renewal.status === "Approved" || renewal.status === "Rejected") {
            throw new AppError_1.AppError("Renewal has already been processed", 400);
        }
        const { workflowNotificationQueue } = await Promise.resolve().then(() => __importStar(require("../../jobs/queues")));
        let nextStatus = renewal.status;
        let updateFields = {};
        let notificationEvent = null;
        let decision = undefined;
        if (reviewerRole === "HOD") {
            if (action !== "approve" && action !== "reject") {
                throw new AppError_1.AppError("Invalid action for HOD", 400);
            }
            if (action === "approve") {
                nextStatus = "Pending Principal";
            }
            else {
                nextStatus = "Rejected";
                decision = "rejected";
                notificationEvent = "principal_decision"; // Reusing the decision workflow
            }
            updateFields = {
                status: nextStatus,
                hod_feedback: feedback
            };
        }
        else if (reviewerRole === "Principal" || reviewerRole === "Admin") {
            if (action === "approve") {
                nextStatus = "Approved";
                decision = "approved";
            }
            else {
                nextStatus = "Rejected";
                decision = "rejected";
            }
            notificationEvent = "principal_decision";
            updateFields = {
                status: nextStatus,
                principal_feedback: feedback
            };
        }
        else {
            throw new AppError_1.AppError("Unauthorized role for reviewing renewals", 403);
        }
        // 2. Update the renewal record
        const { error: updateErr } = await supabase_1.supabaseAdmin
            .from("document_renewals")
            .update(updateFields)
            .eq("id", renewalId);
        if (updateErr) {
            throw new AppError_1.AppError("Failed to update renewal", 500, updateErr.message);
        }
        // 3. If fully approved, replace original document!
        let immediateMilestoneDays = null;
        if (nextStatus === "Approved") {
            const { status: calculatedStatus, flags, milestoneDays } = (0, exports.calculateStatusAndFlags)(renewal.expiry_date);
            immediateMilestoneDays = milestoneDays;
            const { error: docUpdateErr } = await supabase_1.supabaseAdmin
                .from("documents")
                .update({
                file_path: renewal.file_path,
                expiry_date: renewal.expiry_date,
                status: calculatedStatus,
                ...flags
            })
                .eq("id", renewal.document_id);
            if (docUpdateErr) {
                throw new AppError_1.AppError("Failed to update parent document", 500, docUpdateErr.message);
            }
        }
        // 4. Send notifications
        if (notificationEvent) {
            try {
                await workflowNotificationQueue.add("workflow-notification", {
                    event: notificationEvent,
                    documentId: renewal.document_id,
                    documentName: renewal.documents?.document_name ?? "Unknown Document",
                    instituteId: renewal.documents?.institute_id,
                    actorName: reviewerName,
                    actorRole: reviewerRole,
                    feedback,
                    decision
                });
                // If renewing with an intrinsically expiring document, immediately dispatch expiry warning!
                if (immediateMilestoneDays !== null) {
                    await workflowNotificationQueue.add("workflow-notification", {
                        event: "document_expiring",
                        documentId: renewal.document_id,
                        documentName: renewal.documents?.document_name ?? "Unknown Document",
                        instituteId: renewal.documents?.institute_id,
                        actorName: "System",
                        actorRole: "System",
                        milestoneDays: immediateMilestoneDays
                    });
                }
            }
            catch (err) {
                // Silently ignore queue errors
            }
        }
        return { success: true, status: nextStatus };
    },
    deleteDocument: async (documentId, _instituteId) => {
        // Fetch parent document to get its file_path
        const { data: document, error: docErr } = await supabase_1.supabaseAdmin
            .from("documents")
            .select("file_path, institute_id")
            .eq("id", documentId)
            .single();
        if (docErr || !document) {
            throw new AppError_1.AppError("Document not found", 404);
        }
        // Safety check: ensure Institute ID matches if provided (for context isolation)
        if (_instituteId && document.institute_id !== _instituteId) {
            throw new AppError_1.AppError("Unauthorized to delete this document", 403);
        }
        // Fetch all connected renewals to harvest their file paths
        const { data: renewals, error: renErr } = await supabase_1.supabaseAdmin
            .from("document_renewals")
            .select("file_path")
            .eq("document_id", documentId);
        if (renErr) {
            throw new AppError_1.AppError("Failed to fetch document renewals", 500, renErr.message);
        }
        const filesToDelete = [
            document.file_path,
            ...(renewals || []).map(r => r.file_path)
        ];
        // Delete the blobs from Supabase Storage
        const { error: storageErr } = await supabase_1.supabaseAdmin
            .storage
            .from(env_1.env.SUPABASE_STORAGE_BUCKET)
            .remove(filesToDelete);
        if (storageErr) {
            throw new AppError_1.AppError("Failed to delete files from storage", 500, storageErr.message);
        }
        // Delete the database row
        // (Cascade handles approvals & document_renewals tables)
        const { error: deleteErr } = await supabase_1.supabaseAdmin
            .from("documents")
            .delete()
            .eq("id", documentId);
        if (deleteErr) {
            throw new AppError_1.AppError("Failed to delete document record", 500, deleteErr.message);
        }
    }
};
