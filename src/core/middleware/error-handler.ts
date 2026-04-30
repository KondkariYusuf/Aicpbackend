import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { logger } from "../utils/logger";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.requestId ?? null;

  if (err instanceof AppError) {
    logger.warn({ requestId, err }, "Handled application error");
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details ?? null,
      requestId
    });
    return;
  }

  if (err instanceof ZodError) {
    logger.warn({ requestId, issues: err.issues }, "Validation failed");
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: err.issues,
      requestId
    });
    return;
  }

  const fallback = err instanceof Error ? err.message : "Internal server error";

  logger.error({ requestId, err }, "Unhandled error");

  res.status(500).json({
    success: false,
    error: fallback,
    requestId
  });
};
