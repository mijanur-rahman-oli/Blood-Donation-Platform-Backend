import rateLimit from 'express-rate-limit';
import config from '../config';

export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later',
    errors: [{ path: '', message: 'Rate limit exceeded' }],
  },
});

// Stricter limiter for sensitive authentication endpoints (login/register) to
// mitigate brute-force and credential-stuffing attacks.
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later',
    errors: [{ path: '', message: 'Auth rate limit exceeded' }],
  },
});
