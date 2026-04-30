import { z } from "zod";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"] as const;

export const generateUploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  fileType: z.enum(allowedMimeTypes),
  fileSize: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES)
});

export const reviewRenewalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  feedback: z.string().optional()
});

export const confirmUploadSchema = z.object({
  documentId: z.string().uuid(),
  documentName: z.string().min(1),
  category: z.string().min(1),
  responsiblePerson: z.string().min(1),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  securePath: z.string().min(1)
});

export type GenerateUploadUrlInput = z.infer<typeof generateUploadUrlSchema>;
export type ReviewRenewalInput = z.infer<typeof reviewRenewalSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
