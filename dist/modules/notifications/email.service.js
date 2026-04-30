"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWorkflowEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../../config/env");
const logger_1 = require("../../core/utils/logger");
let transporter = null;
/**
 * Lazily create the Nodemailer SMTP transporter.
 * Returns null if SMTP credentials are not configured.
 */
const getTransporter = () => {
    if (transporter) {
        return transporter;
    }
    if (!env_1.env.EMAIL_SMTP_HOST || !env_1.env.EMAIL_SMTP_USER || !env_1.env.EMAIL_SMTP_PASS) {
        logger_1.logger.warn("SMTP credentials not configured — email notifications disabled");
        return null;
    }
    transporter = nodemailer_1.default.createTransport({
        host: env_1.env.EMAIL_SMTP_HOST,
        port: env_1.env.EMAIL_SMTP_PORT,
        secure: env_1.env.EMAIL_SMTP_PORT === 465,
        auth: {
            user: env_1.env.EMAIL_SMTP_USER,
            pass: env_1.env.EMAIL_SMTP_PASS
        }
    });
    return transporter;
};
/**
 * Send a workflow notification email.
 * Gracefully skips if SMTP is not configured.
 */
const sendWorkflowEmail = async (to, subject, htmlBody) => {
    const mailer = getTransporter();
    if (!mailer) {
        logger_1.logger.info({ to, subject }, "Skipping email — SMTP not configured");
        return false;
    }
    const fromAddress = env_1.env.EMAIL_FROM_ADDRESS ?? env_1.env.EMAIL_SMTP_USER ?? "noreply@aicp.local";
    try {
        const info = await mailer.sendMail({
            from: `"AICP Portal" <${fromAddress}>`,
            to,
            subject,
            html: htmlBody
        });
        logger_1.logger.info({ messageId: info.messageId, to, subject }, "Workflow email sent successfully");
        return true;
    }
    catch (error) {
        logger_1.logger.error({ to, subject, error: error instanceof Error ? error.message : "Unknown" }, "Failed to send workflow email");
        throw error;
    }
};
exports.sendWorkflowEmail = sendWorkflowEmail;
