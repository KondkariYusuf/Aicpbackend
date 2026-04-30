import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../../config/env";
import { AppError } from "../errors/AppError";

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const role = req.auth?.profile.role;

    if (!role) {
      next(new AppError("Unauthorized", 401));
      return;
    }

    if (!allowedRoles.includes(role)) {
      next(new AppError("Forbidden", 403));
      return;
    }

    next();
  };
};
