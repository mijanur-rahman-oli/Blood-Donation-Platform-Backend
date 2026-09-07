import { ZodError, ZodIssue } from 'zod';

interface IGenericErrorResponse {
  statusCode: number;
  message: string;
  errors: { path: string; message: string }[];
}

const handleZodError = (error: ZodError): IGenericErrorResponse => {
  const errors = error.issues.map((issue: ZodIssue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  return {
    statusCode: 400,
    message: 'Validation Error',
    errors,
  };
};

export default handleZodError;
