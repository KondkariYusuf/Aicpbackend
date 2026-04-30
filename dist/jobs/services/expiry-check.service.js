"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDailyExpiryCheck = void 0;
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../core/utils/logger");
const queues_1 = require("../queues");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
/**
 * Returns the start of the current UTC day (midnight) to ensure
 * all date comparisons are timezone-agnostic.
 */
const startOfUtcDay = (value) => {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
};
/**
 * Calculates the number of whole days between today (UTC) and the given expiry date.
 * Returns negative values if the document is already expired.
 */
const getDaysUntilExpiry = (expiryDateIso, now) => {
    const today = startOfUtcDay(now).getTime();
    const expiry = startOfUtcDay(new Date(expiryDateIso)).getTime();
    return Math.floor((expiry - today) / MS_PER_DAY);
};
const calculateStatus = (daysUntilExpiry) => {
    if (daysUntilExpiry < 0) {
        return "Expired";
    }
    if (daysUntilExpiry <= 90) {
        return "Expiring Soon";
    }
    return "Valid";
};
/**
 * Maps exact day milestones to notification types.
 * Only triggers on exactly 90, 30, and 0 days before expiry.
 */
const milestoneForDay = (daysUntilExpiry) => {
    if (daysUntilExpiry === 90) {
        return "THREE_MONTHS";
    }
    if (daysUntilExpiry === 30) {
        return "ONE_MONTH";
    }
    if (daysUntilExpiry === 0) {
        return "EXACT_DAY";
    }
    return null;
};
/**
 * Fetches the institute name by ID using supabaseAdmin (bypasses RLS).
 */
const fetchInstituteName = async (instituteId) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from("institutes")
        .select("id, name")
        .eq("id", instituteId)
        .maybeSingle();
    if (error || !data) {
        logger_1.logger.warn({ instituteId, error: error?.message }, "Could not fetch institute name");
        return "Unknown Institute";
    }
    return data.name;
};
/**
 * Fetches Principals and Institute Authorities for a given institute,
 * who should receive expiry notifications.
 * Uses supabaseAdmin to bypass RLS (this is a system-level background job).
 */
const fetchNotificationRecipients = async (instituteId) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from("users")
        .select("full_name, phone")
        .eq("institute_id", instituteId)
        .in("role", ["Principal", "Admin"])
        .returns();
    if (error) {
        logger_1.logger.error({ instituteId, error: error.message }, "Failed to fetch notification recipients");
        return [];
    }
    return (data ?? []).filter((user) => !!user.phone);
};
/**
 * @security This function uses `supabaseAdmin` (service-role key) to bypass RLS.
 * It is intended ONLY for the background job scheduler — never expose it via an API route.
 *
 * Daily expiry check flow:
 * 1. Fetch all documents expiring within 90 days.
 * 2. Update their `status` column if it has changed (Valid → Expiring Soon → Expired).
 * 3. For milestone days (exactly 90, 30, 0 days), fetch responsible users and queue WhatsApp notifications.
 */
const runDailyExpiryCheck = async () => {
    const now = new Date();
    const ninetyDaysFromNow = startOfUtcDay(new Date(now.getTime() + 90 * MS_PER_DAY)).toISOString().slice(0, 10);
    // ── Step 1: Fetch all documents expiring within 90 days ──
    const { data, error } = await supabase_1.supabaseAdmin
        .from("documents")
        .select("id, institute_id, document_name, expiry_date, status")
        .lte("expiry_date", ninetyDaysFromNow)
        .returns();
    if (error) {
        throw new Error(`Failed to fetch documents for expiry checker: ${error.message}`);
    }
    const documents = data ?? [];
    let updated = 0;
    let notificationsQueued = 0;
    // Cache institute names to avoid repeated lookups
    const instituteNameCache = new Map();
    for (const doc of documents) {
        const daysUntilExpiry = getDaysUntilExpiry(doc.expiry_date, now);
        const nextStatus = calculateStatus(daysUntilExpiry);
        // ── Step 2: Update status if changed ──
        if (nextStatus !== doc.status) {
            const { error: updateError } = await supabase_1.supabaseAdmin
                .from("documents")
                .update({ status: nextStatus })
                .eq("id", doc.id);
            if (updateError) {
                logger_1.logger.error({
                    documentId: doc.id,
                    currentStatus: doc.status,
                    nextStatus,
                    error: updateError.message
                }, "Failed to update document status");
            }
            else {
                logger_1.logger.info({ documentId: doc.id, from: doc.status, to: nextStatus }, "Document status updated");
                updated += 1;
            }
        }
        // ── Step 3: Check if this is a notification milestone day ──
        const milestone = milestoneForDay(daysUntilExpiry);
        if (!milestone) {
            continue;
        }
        // Resolve institute name (with cache)
        if (!instituteNameCache.has(doc.institute_id)) {
            const name = await fetchInstituteName(doc.institute_id);
            instituteNameCache.set(doc.institute_id, name);
        }
        const instituteName = instituteNameCache.get(doc.institute_id) ?? "Unknown Institute";
        // Fetch recipients (Principals + Institute Authorities with phone numbers)
        const recipients = await fetchNotificationRecipients(doc.institute_id);
        if (recipients.length === 0) {
            logger_1.logger.warn({ documentId: doc.id, instituteId: doc.institute_id }, "No recipients with phone numbers found for milestone notification");
            continue;
        }
        // ── Step 4: Queue one notification job per recipient ──
        const todayIso = startOfUtcDay(now).toISOString().slice(0, 10);
        for (const recipient of recipients) {
            await queues_1.notificationQueue.add("document-expiry-notification", {
                documentId: doc.id,
                instituteId: doc.institute_id,
                instituteName,
                documentName: doc.document_name,
                expiryDate: doc.expiry_date,
                daysUntilExpiry,
                milestone,
                recipientName: recipient.full_name,
                recipientPhone: recipient.phone
            }, {
                // Dedup key: one notification per doc + milestone + recipient + day
                jobId: `${doc.id}:${milestone}:${recipient.phone}:${todayIso}`
            });
            notificationsQueued += 1;
        }
        logger_1.logger.info({
            documentId: doc.id,
            milestone,
            recipientCount: recipients.length
        }, "Milestone notifications queued");
    }
    return {
        scanned: documents.length,
        updated,
        notificationsQueued
    };
};
exports.runDailyExpiryCheck = runDailyExpiryCheck;
