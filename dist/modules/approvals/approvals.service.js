"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvalsService = void 0;
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../core/errors/AppError");
exports.approvalsService = {
    /**
     * Submit feedback, approve, or reject a document.
     * - HOD can only submit "feedback" action → step becomes "HOD Reviewed"
     * - Principal can submit "approve" or "reject" → step becomes "Principal Approved" or "Rejected"
     */
    submit: async (payload, reviewerId, reviewerRole) => {
        // Determine the new step based on role + action
        let newStep;
        if (reviewerRole === "HOD") {
            if (payload.action !== "feedback") {
                throw new AppError_1.AppError("HOD can only submit feedback, not approve/reject", 403);
            }
            newStep = "HOD Reviewed";
        }
        else if (reviewerRole === "Principal") {
            if (payload.action === "approve") {
                newStep = "Principal Approved";
            }
            else if (payload.action === "reject") {
                newStep = "Rejected";
            }
            else {
                // Principal can also give feedback without final decision
                newStep = "HOD Reviewed";
            }
        }
        else if (reviewerRole === "Admin") {
            // Admin can do anything
            if (payload.action === "approve") {
                newStep = "Principal Approved";
            }
            else if (payload.action === "reject") {
                newStep = "Rejected";
            }
            else {
                newStep = "HOD Reviewed";
            }
        }
        else {
            throw new AppError_1.AppError("Unauthorized to manage approvals", 403);
        }
        // Insert the approval record
        const { data, error } = await supabase_1.supabaseAdmin
            .from("approvals")
            .insert({
            document_id: payload.documentId,
            reviewer_id: reviewerId,
            feedback: payload.feedback,
            step: newStep
        })
            .select("id, document_id, reviewer_id, feedback, step, created_at")
            .single();
        if (error || !data) {
            throw new AppError_1.AppError("Failed to submit approval", 400, error?.message);
        }
        return data;
    },
    /**
     * List approvals. If instituteId is provided, filter by institute.
     * Admin gets all approvals (pass null).
     */
    list: async (instituteId) => {
        let query = supabase_1.supabaseAdmin
            .from("approvals")
            .select("*, documents(id, document_name, institute_id, uploader_id, status, institutes(name)), users:reviewer_id(full_name)")
            .order("created_at", { ascending: false });
        // If not admin (has institute_id), filter by institute
        if (instituteId) {
            // We need to filter approvals where the document belongs to this institute
            // Supabase doesn't support nested filters easily, so we do a subquery approach
            const { data: docIds, error: docErr } = await supabase_1.supabaseAdmin
                .from("documents")
                .select("id")
                .eq("institute_id", instituteId);
            if (docErr) {
                throw new AppError_1.AppError("Failed to fetch documents for approvals", 500, docErr.message);
            }
            const ids = (docIds ?? []).map((d) => d.id);
            if (ids.length === 0) {
                return [];
            }
            query = query.in("document_id", ids);
        }
        const { data, error } = await query.returns();
        if (error) {
            throw new AppError_1.AppError("Failed to fetch approvals", 500, error.message);
        }
        return data ?? [];
    },
    /**
     * Get document details for notification purposes.
     */
    getDocumentInfo: async (documentId) => {
        const { data, error } = await supabase_1.supabaseAdmin
            .from("documents")
            .select("id, document_name, institute_id, uploader_id")
            .eq("id", documentId)
            .single();
        if (error || !data) {
            return null;
        }
        return data;
    }
};
