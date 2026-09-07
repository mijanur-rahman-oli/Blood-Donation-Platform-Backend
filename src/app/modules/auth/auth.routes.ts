import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';
import validateRequest from '../../middlewares/validateRequest';
import { authRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validateRequest(AuthValidation.register),
  AuthController.register,
);

router.post('/login', authRateLimiter, validateRequest(AuthValidation.login), AuthController.login);

// Google Sign-In (GCP Social Login). The client (Postman/mobile/web) obtains a
// Google ID token via Google's official sign-in flow and posts it here to be
// verified server-side - this keeps the endpoint fully testable without a browser
// redirect, which fits a backend-only, Postman-driven assignment.
router.post(
  '/google',
  authRateLimiter,
  validateRequest(AuthValidation.googleLogin),
  AuthController.googleLogin,
);

router.post(
  '/refresh-token',
  validateRequest(AuthValidation.refreshToken),
  AuthController.refreshToken,
);

router.post('/logout', validateRequest(AuthValidation.refreshToken), AuthController.logout);

export const AuthRoutes = router;
