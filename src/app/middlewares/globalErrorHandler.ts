import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import handleZodError from '../errors/handleZodError';
import handlePrismaError from '../errors/handlePrismaError';

const globalErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let statusCode = 500;
  let message = 'Something went wrong';
  let errors: unknown[] = [];

  if (error instanceof ZodError) {
    const simplified = handleZodError(error);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errors = simplified.errors;
  } else if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    const simplified = handlePrismaError(error);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errors = simplified.errors;
  } else if (error instanceof jwt.JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid token';
    errors = [{ path: '', message: 'Invalid or malformed authentication token' }];
  } else if (error instanceof jwt.TokenExpiredError) {
    statusCode = 401;
    message = 'Token expired';
    errors = [{ path: '', message: 'Authentication token has expired' }];
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errors = error.errors.length ? error.errors : [{ path: '', message: error.message }];
  } else if (error instanceof Error) {
    message = error.message;
    errors = [{ path: '', message: error.message }];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: config.env === 'development' ? error?.stack : undefined,
  });
};

export default globalErrorHandler;
