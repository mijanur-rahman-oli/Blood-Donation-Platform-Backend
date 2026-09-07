import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';

/**
 * Validates req.body / req.query / req.params against a Zod schema shaped as
 * { body?, query?, params? }. Reused across every module's routes.
 */
const validateRequest =
  (schema: AnyZodObject) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      next(error);
    }
  };

export default validateRequest;
