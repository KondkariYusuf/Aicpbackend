import { z } from "zod";

export const storageObjectCreatedSchema = z.object({
  event: z.literal("OBJECT_CREATED"),
  bucket: z.string().min(1),
  key: z.string().min(1),
  size: z.number().int().nonnegative(),
  mimeType: z.string().min(1).optional(),
  createdAt: z.string().datetime()
});

export type StorageObjectCreatedPayload = z.infer<typeof storageObjectCreatedSchema>;
