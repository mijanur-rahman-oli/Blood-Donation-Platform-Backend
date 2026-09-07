import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DonationService } from './donation.service';

const getAll = catchAsync(async (req, res) => {
  const { meta, result } = await DonationService.getAll(req.query);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Donation history retrieved successfully', meta, data: result });
});

const getById = catchAsync(async (req, res) => {
  const result = await DonationService.getById(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Donation record retrieved successfully', data: result });
});

export const DonationController = { getAll, getById };
