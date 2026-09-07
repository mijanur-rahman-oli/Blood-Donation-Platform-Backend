import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  databaseUrl: process.env.DATABASE_URL as string,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL as string,
  },

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  corsOrigin: process.env.CORS_ORIGIN || '*',

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  },

  sslcommerz: {
    storeId: process.env.SSLCOMMERZ_STORE_ID as string,
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD as string,
    isLive: process.env.SSLCOMMERZ_IS_LIVE === 'true',
    successUrl: process.env.SSLCOMMERZ_SUCCESS_URL as string,
    failUrl: process.env.SSLCOMMERZ_FAIL_URL as string,
    cancelUrl: process.env.SSLCOMMERZ_CANCEL_URL as string,
    ipnUrl: process.env.SSLCOMMERZ_IPN_URL as string,
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@blooddonation.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
  },
};
