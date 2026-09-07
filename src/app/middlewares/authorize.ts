import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';

/**
 * Must run AFTER authenticate(). Restricts a route to the given role(s).
 * Enforced strictly at the route level - never relies on frontend restrictions.
 */
const authorize =
  (...allowedRoles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to perform this action');
    }

    next();
  };

export default authorize;
