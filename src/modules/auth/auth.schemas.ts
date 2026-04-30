import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(120),
  instituteId: z.string().uuid(),
  role: z.enum(["Clerk", "HOD", "Principal"]),
  phoneNumber: z.string().min(10).max(15).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
