import { z } from "zod";

export const createInstituteSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(20).toUpperCase()
});

export type CreateInstituteInput = z.infer<typeof createInstituteSchema>;
