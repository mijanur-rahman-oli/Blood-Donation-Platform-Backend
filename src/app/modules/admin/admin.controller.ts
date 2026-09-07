import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AdminService } from './admin.service';
import { AuditLogService } from '../auditLog/auditLog.service';
import { BloodRequestService } from '../bloodRequest/bloodRequest.service';

const getAllUsers = catchAsync(async (req, res) => {
  const { meta, result } = await AdminService.getAllUsers(req.query);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Users retrieved successfully', meta, data: result });
});

const updateUserRole = catchAsync(async (req, res) => {
  const result = await AdminService.updateUserRole(req.params.id, req.body.role, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'User role updated successfully', data: result });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const result = await AdminService.updateUserStatus(req.params.id, req.body.status, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'User status updated successfully', data: result });
});

const getDashboardStats = catchAsync(async (_req, res) => {
  const result = await AdminService.getDashboardStats();
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Dashboard statistics retrieved successfully', data: result });
});

const getAuditLogs = catchAsync(async (req, res) => {
  const { meta, result } = await AuditLogService.getAll(req.query);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Audit logs retrieved successfully', meta, data: result });
});

const getAllBloodRequests = catchAsync(async (req, res) => {
  const { meta, result } = await BloodRequestService.getAll(req.query);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Blood requests retrieved successfully', meta, data: result });
});

export const AdminController = {
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  getDashboardStats,
  getAuditLogs,
  getAllBloodRequests,
};
