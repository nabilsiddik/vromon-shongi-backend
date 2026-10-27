import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

// Validate request according to the zod schema
const validateRequest =
  (zodSchema: z.ZodTypeAny) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let data = req.body;

      if (typeof req.body?.data === "string") {
        try {
          data = JSON.parse(req.body.data);
        } catch {
          data = req.body;
        }
      } else if (req.body?.data && typeof req.body.data === "object") {
        data = req.body.data;
      }

      const parsedData: any = await zodSchema.parseAsync(data);
      req.body = { ...req.body, ...parsedData };

      return next();
    } catch (err: unknown) {
      next(err);
    }
  };

export default validateRequest;

