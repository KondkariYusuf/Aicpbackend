import type { Request, Response } from "express";
import { createInstituteSchema } from "./institutes.schemas";
import { institutesService } from "./institutes.service";

export const institutesController = {
  create: async (req: Request, res: Response) => {
    const payload = createInstituteSchema.parse(req.body);
    const institute = await institutesService.create(payload);

    res.status(201).json({
      success: true,
      data: institute
    });
  },

  list: async (_req: Request, res: Response) => {
    const institutes = await institutesService.list();

    res.status(200).json({
      success: true,
      data: institutes
    });
  },

  stats: async (_req: Request, res: Response) => {
    const stats = await institutesService.getStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  }
};
