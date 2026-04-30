import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../core/utils/logger";

let transporter: Transporter | null = null;

/**
 * Lazily create the Nodemailer SMTP transporter.
 * Returns null if SMTP credentials are not configured.
 */
const getTransporter = (): Transporter | null => {
  if (transporter) {
    return transporter;
  }

  if (!env.EMAIL_SMTP_HOST || !env.EMAIL_SMTP_USER || !env.EMAIL_SMTP_PASS) {
    logger.warn("SMTP credentials not configured — email notifications disabled");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.EMAIL_SMTP_HOST,
    port: env.EMAIL_SMTP_PORT,
    secure: env.EMAIL_SMTP_PORT === 465,
    auth: {
      user: env.EMAIL_SMTP_USER,
      pass: env.EMAIL_SMTP_PASS
    }
  });

  return transporter;
};

/**
 * Send a workflow notification email.
 * Gracefully skips if SMTP is not configured.
 */
export const sendWorkflowEmail = async (
  to: string,
  subject: string,
  htmlBody: string
): Promise<boolean> => {
  const mailer = getTransporter();

  if (!mailer) {
    logger.info({ to, subject }, "Skipping email — SMTP not configured");
    return false;
  }

  const fromAddress = env.EMAIL_FROM_ADDRESS ?? env.EMAIL_SMTP_USER ?? "noreply@aicp.local";

  try {
    const info = await mailer.sendMail({
      from: `"AICP Portal" <${fromAddress}>`,
      to,
      subject,
      html: htmlBody
    });

    logger.info(
      { messageId: info.messageId, to, subject },
      "Workflow email sent successfully"
    );

    return true;
  } catch (error) {
    logger.error(
      { to, subject, error: error instanceof Error ? error.message : "Unknown" },
      "Failed to send workflow email"
    );
    throw error;
  }
};
