import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DonorService } from './donor.service';

const createProfile = catchAsync(async (req, res) => {
  const result = await DonorService.createProfile(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Donor profile created successfully',
    data: result,
  });
});

const getMyProfile = catchAsync(async (req, res) => {
  const result = await DonorService.getMyProfile(req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Donor profile retrieved successfully', data: result });
});

const updateMyProfile = catchAsync(async (req, res) => {
  const result = await DonorService.updateMyProfile(req.user!.userId, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Donor profile updated successfully', data: result });
});

const updateAvailability = catchAsync(async (req, res) => {
  const result = await DonorService.updateAvailability(req.user!.userId, req.body.availability);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Availability updated successfully', data: result });
});

const getMatchingRequests = catchAsync(async (req, res) => {
  const { meta, result } = await DonorService.getMatchingRequests(req.user!.userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Matching blood requests retrieved successfully',
    meta,
    data: result,
  });
});

const getMyDonationHistory = catchAsync(async (req, res) => {
  const { meta, result } = await DonorService.getMyDonationHistory(req.user!.userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Donation history retrieved successfully',
    meta,
    data: result,
  });
});

const searchDonors = catchAsync(async (req, res) => {
  const { meta, result } = await DonorService.searchDonors(req.query);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Donors retrieved successfully', meta, data: result });
});

export const DonorController = {
  createProfile,
  getMyProfile,
  updateMyProfile,
  updateAvailability,
  getMatchingRequests,
  getMyDonationHistory,
  searchDonors,
};
