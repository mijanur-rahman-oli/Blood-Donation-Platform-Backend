import { Prisma } from '@prisma/client';

interface IGenericErrorResponse {
  statusCode: number;
  message: string;
  errors: { path: string; message: string }[];
}

const handlePrismaError = (
  error: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
): IGenericErrorResponse => {
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: 400,
      message: 'Invalid request data sent to the database',
      errors: [{ path: '', message: error.message.split('\n').pop() || 'Validation error' }],
    };
  }

  switch (error.code) {
    case 'P2002': {
      const target = (error.meta?.target as string[]) || [];
      return {
        statusCode: 409,
        message: 'Duplicate entry',
        errors: [{ path: target.join(', '), message: `${target.join(', ')} already exists` }],
      };
    }
    case 'P2025':
      return {
        statusCode: 404,
        message: 'Record not found',
        errors: [{ path: '', message: (error.meta?.cause as string) || 'Requested record was not found' }],
      };
    case 'P2003':
      return {
        statusCode: 400,
        message: 'Invalid reference to a related record',
        errors: [{ path: (error.meta?.field_name as string) || '', message: 'Foreign key constraint failed' }],
      };
    default:
      return {
        statusCode: 400,
        message: 'Database error',
        errors: [{ path: '', message: error.message }],
      };
  }
};

export default handlePrismaError;
