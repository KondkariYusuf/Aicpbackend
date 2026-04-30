import { supabaseAdmin } from "../../config/supabase";
import { AppError } from "../../core/errors/AppError";
import type { CreateInstituteInput } from "./institutes.schemas";

interface InstituteRow {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

interface DocumentCountRow {
  institute_id: string;
  status: string;
}

interface InstituteStatsResult {
  id: string;
  name: string;
  code: string;
  totalDocuments: number;
  validDocuments: number;
  complianceScore: number;
}

export const institutesService = {
  /**
   * Create a new institute. Admin-only.
   */
  create: async (payload: CreateInstituteInput): Promise<InstituteRow> => {
    const { data, error } = await supabaseAdmin
      .from("institutes")
      .insert({
        name: payload.name,
        code: payload.code
      })
      .select("id, name, code, created_at")
      .single<InstituteRow>();

    if (error || !data) {
      throw new AppError("Failed to create institute", 400, error?.message);
    }

    return data;
  },

  /**
   * List all institutes (public, for registration dropdown).
   */
  list: async (): Promise<InstituteRow[]> => {
    const { data, error } = await supabaseAdmin
      .from("institutes")
      .select("id, name, code, created_at")
      .order("name")
      .returns<InstituteRow[]>();

    if (error) {
      throw new AppError("Failed to fetch institutes", 500, error.message);
    }

    return data ?? [];
  },

  /**
   * Get compliance stats for each institute.
   * Compliance score = (valid_documents / total_documents) * 100
   * Admin-only.
   */
  getStats: async (): Promise<InstituteStatsResult[]> => {
    // Fetch all institutes
    const { data: institutes, error: instError } = await supabaseAdmin
      .from("institutes")
      .select("id, name, code")
      .order("name")
      .returns<{ id: string; name: string; code: string }[]>();

    if (instError || !institutes) {
      throw new AppError("Failed to fetch institutes", 500, instError?.message);
    }

    // Fetch all documents with just the fields we need
    const { data: documents, error: docError } = await supabaseAdmin
      .from("documents")
      .select("institute_id, status")
      .returns<DocumentCountRow[]>();

    if (docError) {
      throw new AppError("Failed to fetch documents for stats", 500, docError.message);
    }

    const docs = documents ?? [];

    // Build stats per institute
    return institutes.map((inst) => {
      const instDocs = docs.filter((d) => d.institute_id === inst.id);
      const totalDocuments = instDocs.length;
      const validDocuments = instDocs.filter((d) => d.status === "Valid").length;
      const complianceScore =
        totalDocuments > 0 ? Math.round((validDocuments / totalDocuments) * 100) : 0;

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
