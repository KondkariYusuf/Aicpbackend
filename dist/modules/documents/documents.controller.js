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
exports.documentsController = void 0;
const documents_schemas_1 = require("./documents.schemas");
const documents_service_1 = require("./documents.service");
const queues_1 = require("../../jobs/queues");
const logger_1 = require("../../core/utils/logger");
exports.documentsController = {
    generateUploadUrl: async (req, res) => {
        const payload = documents_schemas_1.generateUploadUrlSchema.parse(req.body);
        const instituteId = req.auth?.profile.institute_id ?? null;
        const result = await documents_service_1.documentService.generateUploadUrl(payload, instituteId);
        // We no longer send the 'document_uploaded' event here.
        // That is deferred to confirmUpload so we only notify on successful uploads.
        res.status(200).json({
            success: true,
            data: result
        });
    },
    generateRenewalUploadUrl: async (req, res) => {
        const payload = documents_schemas_1.generateUploadUrlSchema.parse(req.body);
        const instituteId = req.auth?.profile.institute_id ?? null;
        const result = await documents_service_1.documentService.generateUploadUrl(payload, instituteId);
        // Note: To be perfectly robust, renewal uploads should also use a confirm-upload flow.
        // For now, this stays here to not break the frontend RenewModal.
        if (instituteId) {
            try {
                await queues_1.workflowNotificationQueue.add("workflow-notification", {
                    event: "renewal_uploaded",
                    documentId: result.documentId,
                    documentName: payload.filename,
                    instituteId,
                    actorName: req.auth?.profile.full_name ?? "Unknown",
                    actorRole: "Clerk"
                });
            }
            catch (err) {
                logger_1.logger.warn({ error: err instanceof Error ? err.message : "Unknown" }, "Failed to queue workflow notification");
            }
        }
        res.status(200).json({
            success: true,
            data: result
        });
    },
    reviewRenewal: async (req, res) => {
        const id = String(req.params.id);
        const { action, feedback } = documents_schemas_1.reviewRenewalSchema.parse(req.body);
        const reviewerId = req.auth?.profile.id;
        const reviewerRole = req.auth?.profile.role;
        const reviewerName = req.auth?.profile.full_name ?? "Unknown";
        if (!reviewerId || !reviewerRole) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }
        const result = await documents_service_1.documentService.reviewRenewal(id, action, feedback, reviewerId, reviewerRole, reviewerName);
        res.status(200).json({
            success: true,
            data: result
        });
    },
    deleteDocument: async (req, res) => {
        const id = String(req.params.id);
        // Only Admin bypasses the institute check. Others only delete within their own institute context.
        const instituteId = req.auth?.profile.role === "Admin" ? undefined : (req.auth?.profile.institute_id ?? undefined);
        await documents_service_1.documentService.deleteDocument(id, instituteId);
        res.status(200).json({
            success: true,
            message: "Document successfully deleted"
        });
    },
    confirmUpload: async (req, res) => {
        const { confirmUploadSchema } = await Promise.resolve().then(() => __importStar(require("./documents.schemas")));
        const payload = confirmUploadSchema.parse(req.body);
        const uploaderId = req.auth?.profile.id;
        const instituteId = req.auth?.profile.institute_id;
        const uploaderRole = req.auth?.profile.role ?? "Clerk";
        const uploaderName = req.auth?.profile.full_name ?? "Unknown";
        if (!uploaderId || !instituteId) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }
        const { status, milestoneDays } = await documents_service_1.documentService.confirmUpload(payload, uploaderId, instituteId);
        // Fallback dispatcher: Try BullMQ first. If Redis is down, run synchronously.
        const dispatchNotification = async (jobData) => {
            try {
                const { env } = await Promise.resolve().then(() => __importStar(require("../../config/env")));
                if (env.REDIS_URL && env.REDIS_URL.includes("127.0.0.1")) {
                    // Developer environment missing Redis? Fallback synchronously.
                    const { processWorkflowNotification } = await Promise.resolve().then(() => __importStar(require("../../jobs/workers/workflow-notification.worker")));
                    await processWorkflowNotification(jobData);
                    return;
                }
                await queues_1.workflowNotificationQueue.add("workflow-notification", jobData);
            }
            catch (err) {
                logger_1.logger.warn({ error: err instanceof Error ? err.message : "Unknown" }, "Failed to queue event, falling back to synchronous execution");
                try {
                    const { processWorkflowNotification } = await Promise.resolve().then(() => __importStar(require("../../jobs/workers/workflow-notification.worker")));
                    await processWorkflowNotification(jobData);
                }
                catch (syncErr) {
                    logger_1.logger.error("Synchronous notification processing also failed");
                }
            }
        };
        // 1. Dispatch document_uploaded event
        await dispatchNotification({
            event: "document_uploaded",
            documentId: payload.documentId,
            documentName: payload.documentName,
            instituteId,
            actorName: uploaderName,
            actorRole: uploaderRole
        });
        // 2. Dispatch immediate expiry notification if already near/past expiration!
        if (milestoneDays !== null) {
            await dispatchNotification({
                event: "document_expiring",
                documentId: payload.documentId,
                documentName: payload.documentName,
                instituteId,
                actorName: "System",
                actorRole: "System",
                milestoneDays
            });
        }
        res.status(200).json({
            success: true,
            data: { status }
        });
    }
};
