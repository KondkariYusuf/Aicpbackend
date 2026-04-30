"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.institutesService = void 0;
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../core/errors/AppError");
exports.institutesService = {
    /**
     * Create a new institute. Admin-only.
     */
    create: async (payload) => {
        const { data, error } = await supabase_1.supabaseAdmin
            .from("institutes")
            .insert({
            name: payload.name,
            code: payload.code
        })
            .select("id, name, code, created_at")
            .single();
        if (error || !data) {
            throw new AppError_1.AppError("Failed to create institute", 400, error?.message);
        }
        return data;
    },
    /**
     * List all institutes (public, for registration dropdown).
     */
    list: async () => {
        const { data, error } = await supabase_1.supabaseAdmin
            .from("institutes")
            .select("id, name, code, created_at")
            .order("name")
            .returns();
        if (error) {
            throw new AppError_1.AppError("Failed to fetch institutes", 500, error.message);
        }
        return data ?? [];
    },
    /**
     * Get compliance stats for each institute.
     * Compliance score = (valid_documents / total_documents) * 100
     * Admin-only.
     */
    getStats: async () => {
        // Fetch all institutes
        const { data: institutes, error: instError } = await supabase_1.supabaseAdmin
            .from("institutes")
            .select("id, name, code")
            .order("name")
            .returns();
        if (instError || !institutes) {
            throw new AppError_1.AppError("Failed to fetch institutes", 500, instError?.message);
        }
        // Fetch all documents with just the fields we need
        const { data: documents, error: docError } = await supabase_1.supabaseAdmin
            .from("documents")
            .select("institute_id, status")
            .returns();
        if (docError) {
            throw new AppError_1.AppError("Failed to fetch documents for stats", 500, docError.message);
        }
        const docs = documents ?? [];
        // Build stats per institute
        return institutes.map((inst) => {
            const instDocs = docs.filter((d) => d.institute_id === inst.id);
            const totalDocuments = instDocs.length;
            const validDocuments = instDocs.filter((d) => d.status === "Valid").length;
            const complianceScore = totalDocuments > 0 ? Math.round((validDocuments / totalDocuments) * 100) : 0;
            return {
                id: inst.id,
                name: inst.name,
                code: inst.code,
                totalDocuments,
                validDocuments,
                complianceScore
            };
        });
    }
};
