"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvalsController = void 0;
const approvals_schemas_1 = require("./approvals.schemas");
const approvals_service_1 = require("./approvals.service");
const queues_1 = require("../../jobs/queues");
exports.approvalsController = {
    submit: async (req, res) => {
        const payload = approvals_schemas_1.submitApprovalSchema.parse(req.body);
        const reviewerId = req.auth.profile.id;
        const reviewerRole = req.auth.profile.role;
        const reviewerName = req.auth.profile.full_name;
        const approval = await approvals_service_1.approvalsService.submit(payload, reviewerId, reviewerRole);
        // Dispatch workflow notification
        const docInfo = await approvals_service_1.approvalsService.getDocumentInfo(payload.documentId);
        if (docInfo) {
            let event;
            if (reviewerRole === "HOD") {
                event = "hod_feedback";
            }
            else if (reviewerRole === "Principal" || reviewerRole === "Admin") {
                event = "principal_decision";
            }
            else {
                event = "hod_feedback"; // fallback
            }
            await queues_1.workflowNotificationQueue.add("workflow-notification", {
                event,
                documentId: docInfo.id,
                documentName: docInfo.document_name,
                instituteId: docInfo.institute_id,
                actorName: reviewerName,
                actorRole: reviewerRole,
                feedback: payload.feedback,
                decision: payload.action === "approve" ? "approved" : payload.action === "reject" ? "rejected" : undefined
            });
        }
        res.status(201).json({
            success: true,
            data: approval
        });
    },
    list: async (req, res) => {
        const role = req.auth.profile.role;
        const instituteId = role === "Admin" ? null : req.auth.profile.institute_id;
        const approvals = await approvals_service_1.approvalsService.list(instituteId);
        res.status(200).json({
            success: true,
            data: approvals
        });
    }
};
