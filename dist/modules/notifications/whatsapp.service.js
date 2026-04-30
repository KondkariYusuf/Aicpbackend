"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppReminder = void 0;
const env_1 = require("../../config/env");
const logger_1 = require("../../core/utils/logger");
const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";
/**
 * Sends a WhatsApp reminder via the Meta Cloud API using a pre-approved
 * utility template named `document_expiry_reminder`.
 *
 * Template parameters (positional, body):
 *   {{1}} = Document name
 *   {{2}} = Institute name
 *   {{3}} = Expiry date (human-readable)
 *
 * @throws if the Meta API returns a non-2xx response or the fetch itself fails.
 */
const sendWhatsAppReminder = async (phone, docName, institute, expiry) => {
    const phoneId = env_1.env.WHATSAPP_PHONE_ID;
    const token = env_1.env.WHATSAPP_API_TOKEN;
    if (!phoneId || !token) {
        logger_1.logger.warn({ phone, docName }, "WhatsApp credentials not configured — skipping message delivery");
        return;
    }
    const url = `${GRAPH_API_BASE}/${phoneId}/messages`;
    const payload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
            name: "document_expiry_reminder",
            language: { code: "en" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: docName },
                        { type: "text", text: institute },
                        { type: "text", text: expiry }
                    ]
                }
            ]
        }
    };
    const childLogger = logger_1.logger.child({
        service: "whatsapp",
        phone,
        docName,
        institute
    });
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15_000) // 15s timeout to prevent hanging
        });
        const body = await response.json();
        if (!response.ok || body.error) {
            childLogger.error({
                status: response.status,
                apiError: body.error?.message ?? "Unknown error",
                errorCode: body.error?.code
            }, "Meta Cloud API returned an error");
            throw new Error(`WhatsApp API error (${response.status}): ${body.error?.message ?? "Unknown"}`);
        }
        const messageId = body.messages?.[0]?.id ?? "unknown";
        childLogger.info({ messageId }, "WhatsApp reminder sent successfully");
    }
    catch (error) {
        // Re-throw after logging so BullMQ can handle retry logic
        if (error instanceof Error && error.name === "TimeoutError") {
            childLogger.error("WhatsApp API request timed out after 15s");
            throw new Error("WhatsApp API request timed out");
        }
        throw error;
    }
};
exports.sendWhatsAppReminder = sendWhatsAppReminder;
