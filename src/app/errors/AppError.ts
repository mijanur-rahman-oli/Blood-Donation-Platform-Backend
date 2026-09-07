class AppError extends Error {
  public statusCode: number;
  public errors: unknown[];
  public isOperational: boolean;

  constructor(statusCode: number, message: string, errors: unknown[] = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
