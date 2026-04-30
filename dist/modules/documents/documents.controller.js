"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsController = void 0;
const documents_schemas_1 = require("./documents.schemas");
const documents_service_1 = require("./documents.service");
const queues_1 = require("../../jobs/queues");
exports.documentsController = {
    generateUploadUrl: async (req, res) => {
        const payload = documents_schemas_1.generateUploadUrlSchema.parse(req.body);
        const instituteId = req.auth?.profile.institute_id ?? null;
        const uploaderName = req.auth?.profile.full_name ?? "Unknown";
        const result = await documents_service_1.documentService.generateUploadUrl(payload, instituteId);
        // Dispatch workflow notification: Clerk uploads → Notify HOD & Principal
        if (instituteId) {
            await queues_1.workflowNotificationQueue.add("workflow-notification", {
                event: "document_uploaded",
                documentId: result.documentId,
                documentName: payload.filename,
                instituteId,
                actorName: uploaderName,
                actorRole: "Clerk"
            });
        }
        res.status(200).json({
            success: true,
            data: result
        });
    }
};
