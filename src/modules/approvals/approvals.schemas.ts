import { z } from "zod";

export const submitApprovalSchema = z.object({
  documentId: z.string().uuid(),
  feedback: z.string().min(1).max(2000),
  action: z.enum(["feedback", "approve", "reject"])
});

export type SubmitApprovalInput = z.infer<typeof submitApprovalSchema>;
