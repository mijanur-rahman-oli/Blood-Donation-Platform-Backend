import { PrismaClient } from '@prisma/client';

// Prevent multiple PrismaClient instances in dev (ts-node-dev hot reload).
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

const prisma = global.__prisma__ || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma__ = prisma;
}

export default prisma;
