import type { Request, Response } from "express";
import { authService } from "./auth.service";
import { loginSchema, signupSchema } from "./auth.schemas";

export const authController = {
  signup: async (req: Request, res: Response) => {
    const payload = signupSchema.parse(req.body);
    const user = await authService.signup(payload);

    res.status(201).json({
      success: true,
      data: user
    });
  },

  login: async (req: Request, res: Response) => {
    const payload = loginSchema.parse(req.body);
    const session = await authService.login(payload);

    res.status(200).json({
      success: true,
      data: session
    });
  }
};
