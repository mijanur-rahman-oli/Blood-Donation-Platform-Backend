import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserService } from './user.service';

const getMe = catchAsync(async (req, res) => {
  const result = await UserService.getMe(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile retrieved successfully',
    data: result,
  });
});

const updateMe = catchAsync(async (req, res) => {
  const result = await UserService.updateMe(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile updated successfully',
    data: result,
  });
});

export const UserController = { getMe, updateMe };
