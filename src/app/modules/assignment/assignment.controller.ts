import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AssignmentService } from './assignment.service';

const getById = catchAsync(async (req, res) => {
  const result = await AssignmentService.getById(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Assignment retrieved successfully', data: result });
});

const accept = catchAsync(async (req, res) => {
  const result = await AssignmentService.accept(req.params.id, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Assignment accepted successfully', data: result });
});

const reject = catchAsync(async (req, res) => {
  const result = await AssignmentService.reject(req.params.id, req.user!.userId, req.body.cancelReason);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Assignment rejected successfully', data: result });
});

const complete = catchAsync(async (req, res) => {
  const result = await AssignmentService.complete(req.params.id, req.user!.userId, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Donation completed successfully', data: result });
});

export const AssignmentController = { getById, accept, reject, complete };
