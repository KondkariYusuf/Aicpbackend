export interface ExpiryCheckJobData {
  triggeredBy: "scheduler" | "manual";
}

export interface NotificationJobData {
  documentId: string;
  instituteId: string;
  instituteName: string;
  documentName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  milestone: "THREE_MONTHS" | "ONE_MONTH" | "EXACT_DAY";
  /** Recipient info — fetched from public.users at dispatch time */
  recipientName: string;
  recipientPhone: string;
}

export interface WorkflowNotificationJobData {
  event: "document_uploaded" | "hod_feedback" | "principal_decision" | "document_expiring" | "renewal_uploaded";
  documentId: string;
  documentName: string;
  instituteId: string;
  actorName: string;
  actorRole: string;
  feedback?: string;
  decision?: "approved" | "rejected";
  milestoneDays?: number;
}
