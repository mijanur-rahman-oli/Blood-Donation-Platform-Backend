import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentService } from './payment.service';
import { ROLES } from '../../constants';
import config from '../../config';

const initiate = catchAsync(async (req, res) => {
  const result = await PaymentService.initiate(req.user!.userId, req.user!.email, req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, message: 'Payment initiated successfully', data: result });
});

// SSLCommerz POSTs form data to this URL after a successful payment.
const success = catchAsync(async (req, res) => {
  const { tran_id, val_id } = req.body;
  await PaymentService.validateAndUpdate(tran_id, val_id);
  res.redirect(`${config.corsOrigin}/payment/success?tran_id=${tran_id}`);
});

const fail = catchAsync(async (req, res) => {
  const { tran_id } = req.body;
  if (tran_id) await PaymentService.markFailed(tran_id);
  res.redirect(`${config.corsOrigin}/payment/fail?tran_id=${tran_id || ''}`);
});

const cancel = catchAsync(async (req, res) => {
  const { tran_id } = req.body;
  if (tran_id) await PaymentService.markCancelled(tran_id);
  res.redirect(`${config.corsOrigin}/payment/cancel?tran_id=${tran_id || ''}`);
});

// Instant Payment Notification webhook - the authoritative, server-to-server
// confirmation. Always re-validates against SSLCommerz before trusting it.
const ipn = catchAsync(async (req, res) => {
  const { tran_id, val_id } = req.body;
  const result = await PaymentService.validateAndUpdate(tran_id, val_id);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'IPN processed', data: result });
});

const getById = catchAsync(async (req, res) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  const result = await PaymentService.getById(req.params.id, req.user!.userId, isAdmin);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Payment retrieved successfully', data: result });
});

const getAll = catchAsync(async (req, res) => {
  const userFilter = req.user!.role === ROLES.ADMIN ? undefined : req.user!.userId;
  const { meta, result } = await PaymentService.getAll(req.query, userFilter);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Payments retrieved successfully', meta, data: result });
});

export const PaymentController = { initiate, success, fail, cancel, ipn, getById, getAll };
