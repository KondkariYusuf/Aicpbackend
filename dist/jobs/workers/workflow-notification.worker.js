"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorkflowNotificationWorker = exports.processWorkflowNotification = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../config/redis");
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../core/utils/logger");
const queue_names_1 = require("../queue-names");
const email_service_1 = require("../../modules/notifications/email.service");
/**
 * Fetch users by role within an institute.
 * Uses supabaseAdmin to bypass RLS (system-level background job).
 */
const fetchUsersByRole = async (instituteId, roles) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from("users")
        .select("id, full_name, role")
        .eq("institute_id", instituteId)
        .in("role", roles)
        .returns();
    if (error) {
        logger_1.logger.error({ instituteId, roles, error: error.message }, "Failed to fetch users by role");
        return [];
    }
    return data ?? [];
};
/**
 * Fetch a user's email from auth.users via the Auth Admin API.
 */
const fetchUserEmail = async (userId) => {
    const { data, error } = await supabase_1.supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data.user) {
        return null;
    }
    return data.user.email ?? null;
};
/**
 * Fetch the uploader's info for a document.
 */
const fetchUploader = async (documentId) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from("documents")
        .select("uploader_id")
        .eq("id", documentId)
        .single();
    if (error || !data?.uploader_id) {
        return null;
    }
    const { data: user, error: userError } = await supabase_1.supabaseAdmin
        .from("users")
        .select("id, full_name, role")
        .eq("id", data.uploader_id)
        .single();
    if (userError || !user) {
        return null;
    }
    return user;
};
/**
 * Insert an in-app notification into the database.
 */
const insertNotification = async (userId, title, message, type) => {
    const { error } = await supabase_1.supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title,
        message,
        type,
        is_read: false
    });
    if (error) {
        logger_1.logger.error({ userId, title, error: error.message }, "Failed to insert notification");
    }
};
/**
 * Build email HTML for workflow notifications.
 */
const buildEmailHtml = (title, message, documentName) => {
    return `
    <div style="font-family: 'Space Grotesk', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 3px solid #1a2e1a; padding: 24px;">
      <div style="background: #2d8a4e; color: white; padding: 16px 24px; margin: -24px -24px 24px -24px; border-bottom: 3px solid #1a2e1a;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: -0.5px;">AICP</h1>
        <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8;">Compliance Portal</p>
      </div>
      <h2 style="font-size: 18px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">${title}</h2>
      <p style="font-size: 14px; color: #444; line-height: 1.6;">${message}</p>
      <div style="background: #f0f0f0; border: 2px solid #1a2e1a; padding: 12px; margin-top: 16px;">
        <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Document</p>
        <p style="margin: 4px 0 0 0; font-weight: bold;">${documentName}</p>
      </div>
      <p style="font-size: 11px; color: #999; margin-top: 24px; text-align: center;">
        This is an automated notification from the AICP Compliance Portal.
      </p>
    </div>
  `;
};
const processWorkflowNotification = async (data) => {
    const { event, documentId, documentName, instituteId, actorName, actorRole, feedback, decision } = data;
    logger_1.logger.info({ event, documentName, actorName, actorRole }, "Processing workflow notification");
    let recipients = [];
    let title;
    let message;
    let notificationType;
    switch (event) {
        case "document_uploaded": {
            recipients = await fetchUsersByRole(instituteId, ["HOD", "Principal"]);
            title = "New Document Uploaded";
            message = `${actorName} (${actorRole}) has uploaded "${documentName}" for review.`;
            notificationType = "upload";
            break;
        }
        case "renewal_uploaded": {
            recipients = await fetchUsersByRole(instituteId, ["HOD", "Principal"]);
            title = "Document Renewal Submitted";
            message = `${actorName} (${actorRole}) has submitted a renewal for "${documentName}". It is awaiting your review.`;
            notificationType = "renewal";
            break;
        }
        case "document_expiring": {
            recipients = await fetchUsersByRole(instituteId, ["HOD", "Principal"]);
            const milestoneDays = data.milestoneDays ?? 0;
            title = "Action Required: Document Expiring";
            message = `"${documentName}" is expiring in ${milestoneDays} days (or is already expired). Please take action to renew it.`;
            notificationType = "expiry_warning";
            break;
        }
        case "hod_feedback": {
            const uploader = await fetchUploader(documentId);
            const principals = await fetchUsersByRole(instituteId, ["Principal"]);
            if (uploader) {
                recipients.push(uploader);
            }
            recipients.push(...principals);
            title = "HOD Feedback Submitted";
            message = `${actorName} (HOD) has submitted feedback on "${documentName}": "${feedback ?? "(no comment)"}"`;
            notificationType = "feedback";
            break;
        }
        case "principal_decision": {
            const uploaderForDecision = await fetchUploader(documentId);
            const hods = await fetchUsersByRole(instituteId, ["HOD"]);
            if (uploaderForDecision) {
                recipients.push(uploaderForDecision);
            }
            recipients.push(...hods);
            const decisionLabel = decision === "approved" ? "APPROVED ✅" : "REJECTED ❌";
            title = `Document ${decisionLabel}`;
            message = `${actorName} (Principal) has ${decision} "${documentName}". Feedback: "${feedback ?? "(no comment)"}"`;
            notificationType = "decision";
            break;
        }
        default:
            logger_1.logger.warn({ event }, "Unknown workflow notification event");
            return { sent: false };
    }
    const uniqueRecipients = Array.from(new Map(recipients.map((r) => [r.id, r])).values());
    let notificationsInserted = 0;
    let emailsSent = 0;
    for (const recipient of uniqueRecipients) {
        await insertNotification(recipient.id, title, message, notificationType);
        notificationsInserted++;
        const email = await fetchUserEmail(recipient.id);
        if (email) {
            try {
                const html = buildEmailHtml(title, message, documentName);
                await (0, email_service_1.sendWorkflowEmail)(email, `[AICP] ${title}`, html);
                emailsSent++;
            }
            catch {
                logger_1.logger.warn({ recipientId: recipient.id }, "Email send failed, in-app notification saved");
            }
        }
    }
    logger_1.logger.info({
        event,
        recipientCount: uniqueRecipients.length,
        notificationsInserted,
        emailsSent
    }, "Workflow notification processed");
    return { sent: true, notificationsInserted, emailsSent };
};
exports.processWorkflowNotification = processWorkflowNotification;
const createWorkflowNotificationWorker = () => {
    const worker = new bullmq_1.Worker(queue_names_1.QUEUE_NAMES.WORKFLOW_NOTIFICATION, async (job) => {
        const result = await (0, exports.processWorkflowNotification)(job.data);
        return result;
    }, {
        connection: (0, redis_1.createRedisConnection)(),
        concurrency: 5
    });
    worker.on("failed", (job, err) => {
        logger_1.logger.error({
            jobId: job?.id,
            event: job?.data?.event,
            error: err.message
        }, "Workflow notification worker job failed");
    });
    return worker;
};
exports.createWorkflowNotificationWorker = createWorkflowNotificationWorker;
