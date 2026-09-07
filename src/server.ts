import { Server } from 'http';
import app from './app';
import config from './app/config';
import prisma from './app/utils/prisma';

let server: Server;

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL via Prisma');

    server = app.listen(config.port, () => {
      console.log(`Blood Donation & Emergency Platform API listening on port ${config.port}`);
      console.log(`   Environment: ${config.env}`);
      console.log(`   Base URL:    http://localhost:${config.port}/api/${config.apiVersion}`);
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection detected, shutting down:', error);
    if (server) {
      server.close(() => process.exit(1));
    } else {
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception detected, shutting down:', error);
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    if (server) server.close();
  });
}

main();
