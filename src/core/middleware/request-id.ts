import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const attachRequestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const maybePinoId = (req as Request & { id?: string }).id;
  const requestId = maybePinoId ?? randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  next();
};
