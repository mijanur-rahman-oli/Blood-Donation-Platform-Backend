import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthService } from './auth.service';

const register = catchAsync(async (req, res) => {
  const result = await AuthService.register(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'User registered successfully',
    data: result,
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Logged in successfully',
    data: result,
  });
});

const googleLogin = catchAsync(async (req, res) => {
  const { idToken, role } = req.body;
  const result = await AuthService.googleLogin(idToken, role);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Google login successful',
    data: result,
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const result = await AuthService.refreshToken(req.body.refreshToken);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Access token refreshed successfully',
    data: result,
  });
});

const logout = catchAsync(async (req, res) => {
  await AuthService.logout(req.body.refreshToken);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Logged out successfully',
    data: {},
  });
});

export const AuthController = { register, login, googleLogin, refreshToken, logout };
