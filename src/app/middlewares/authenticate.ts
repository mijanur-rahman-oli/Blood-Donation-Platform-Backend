import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import catchAsync from '../utils/catchAsync';
import { verifyAccessToken, IJwtPayload } from '../utils/jwt';
import prisma from '../utils/prisma';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}

const authenticate = () =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized. Bearer token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || user.deletedAt) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'This user no longer exists');
    }

    if (user.status === 'BLOCKED') {
      throw new AppError(httpStatus.FORBIDDEN, 'This account has been blocked');
    }

    req.user = { userId: user.id, email: user.email, role: user.role };
    next();
  });

export default authenticate;
