import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { BloodRequestService } from './bloodRequest.service';
import { ROLES } from '../../constants';

const createRequest = catchAsync(async (req, res) => {
  const result = await BloodRequestService.createRequest(req.user!.userId, req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, message: 'Blood request created successfully', data: result });
});

const getAll = catchAsync(async (req, res) => {
  // REQUESTERs only see their own requests by default; ADMIN/DONOR see all.
  const requesterFilter = req.user!.role === ROLES.REQUESTER ? req.user!.userId : undefined;
  const { meta, result } = await BloodRequestService.getAll(req.query, requesterFilter);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Blood requests retrieved successfully', meta, data: result });
});

const search = catchAsync(async (req, res) => {
  const { meta, result } = await BloodRequestService.search(req.query);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Search results retrieved successfully', meta, data: result });
});

const getById = catchAsync(async (req, res) => {
  const result = await BloodRequestService.getById(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Blood request retrieved successfully', data: result });
});

const update = catchAsync(async (req, res) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  const result = await BloodRequestService.update(req.params.id, req.user!.userId, isAdmin, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Blood request updated successfully', data: result });
});

const cancel = catchAsync(async (req, res) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  const result = await BloodRequestService.cancel(req.params.id, req.user!.userId, isAdmin);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Blood request cancelled successfully', data: result });
});

const verify = catchAsync(async (req, res) => {
  const result = await BloodRequestService.verify(req.params.id, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Blood request verified successfully', data: result });
});

const getMatches = catchAsync(async (req, res) => {
  const result = await BloodRequestService.getMatches(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Matching donors retrieved successfully', data: result });
});

const assignDonor = catchAsync(async (req, res) => {
  const result = await BloodRequestService.assignDonor(req.params.id, req.body.donorProfileId, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.CREATED, message: 'Donor assigned successfully', data: result });
});

export const BloodRequestController = {
  createRequest,
  getAll,
  search,
  getById,
  update,
  cancel,
  verify,
  getMatches,
  assignDonor,
};
