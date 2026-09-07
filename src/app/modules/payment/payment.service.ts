import httpStatus from 'http-status';
import { v4 as uuidv4 } from 'uuid';
import SSLCommerzPayment from 'sslcommerz-lts';
import { PaymentPurpose, PaymentStatus } from '@prisma/client';
import config from '../../config';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import { buildMeta, buildPaginationOptions } from '../../utils/queryBuilder';
import { AuditLogService } from '../auditLog/auditLog.service';

const sslcz = new SSLCommerzPayment(
  config.sslcommerz.storeId,
  config.sslcommerz.storePassword,
  config.sslcommerz.isLive,
);

interface IInitiatePayload {
  bloodRequestId?: string;
  purpose: PaymentPurpose;
  amount: number;
  customerName: string;
  customerPhone: string;
}

// Payments in this platform are NEVER for the blood itself - donation is always
// free. A requester may optionally pay a verified platform coordination fee,
// an emergency verification fee, or a logistics support fee that funds the
// operational side of connecting donors with recipients in time.
const initiate = async (userId: string, userEmail: string, payload: IInitiatePayload) => {
  if (payload.bloodRequestId) {
    const request = await prisma.bloodRequest.findFirst({
      where: { id: payload.bloodRequestId, deletedAt: null },
    });
    if (!request) throw new AppError(httpStatus.NOT_FOUND, 'Blood request not found');
  }

  const transactionId = `BDEP_${uuidv4()}`;

  const payment = await prisma.payment.create({
    data: {
      userId,
      bloodRequestId: payload.bloodRequestId,
      transactionId,
      purpose: payload.purpose,
      amount: payload.amount,
      currency: 'BDT',
      status: PaymentStatus.PENDING,
      gateway: 'SSLCOMMERZ',
    },
  });

  const sslData = {
    total_amount: payload.amount,
    currency: 'BDT',
    tran_id: transactionId,
    success_url: config.sslcommerz.successUrl,
    fail_url: config.sslcommerz.failUrl,
    cancel_url: config.sslcommerz.cancelUrl,
    ipn_url: config.sslcommerz.ipnUrl,
    shipping_method: 'NO',
    product_name: payload.purpose,
    product_category: 'Service',
    product_profile: 'general',
    cus_name: payload.customerName,
    cus_email: userEmail,
    cus_phone: payload.customerPhone,
    cus_add1: 'N/A',
    cus_city: 'N/A',
    cus_country: 'Bangladesh',
    ship_name: payload.customerName,
    ship_add1: 'N/A',
    ship_city: 'N/A',
    ship_country: 'Bangladesh',
    ship_postcode: '0000',
  };

  const apiResponse = await sslcz.init(sslData);

  if (apiResponse.status !== 'SUCCESS' || !apiResponse.GatewayPageURL) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      apiResponse.failedreason || 'Failed to initiate payment with SSLCommerz',
    );
  }

  return { paymentId: payment.id, transactionId, gatewayPageURL: apiResponse.GatewayPageURL };
};

// Called by SSLCommerz's IPN webhook AND used internally by the success
// redirect handler. Always re-validates with SSLCommerz's server before
// trusting a status change - never a manual/fake status update.
const validateAndUpdate = async (transactionId: string, valId: string) => {
  const payment = await prisma.payment.findUnique({ where: { transactionId } });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, 'Payment record not found');

  if (payment.status === PaymentStatus.PAID) {
    return payment; // already confirmed, idempotent
  }

  const validation = await sslcz.validate({ val_id: valId });

  const isValid =
    (validation.status === 'VALID' || validation.status === 'VALIDATED') &&
    Number(validation.amount) === payment.amount &&
    validation.currency === payment.currency;

  const updated = await prisma.payment.update({
    where: { transactionId },
    data: {
      status: isValid ? PaymentStatus.PAID : PaymentStatus.FAILED,
      paidAt: isValid ? new Date() : undefined,
      gatewayResponse: validation as unknown as object,
    },
  });

  await AuditLogService.record({
    actorId: payment.userId,
    action: isValid ? 'PAYMENT_SUCCEEDED' : 'PAYMENT_VALIDATION_FAILED',
    entityType: 'Payment',
    entityId: payment.id,
    metadata: { transactionId, valId },
  });

  return updated;
};

const markFailed = async (transactionId: string) => {
  return prisma.payment.update({
    where: { transactionId },
    data: { status: PaymentStatus.FAILED },
  });
};

const markCancelled = async (transactionId: string) => {
  return prisma.payment.update({
    where: { transactionId },
    data: { status: PaymentStatus.CANCELLED },
  });
};

const getById = async (id: string, userId: string, isAdmin: boolean) => {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  if (!isAdmin && payment.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You cannot view this payment');
  }
  return payment;
};

const getAll = async (query: Record<string, unknown>, userFilter?: string) => {
  const { page, limit, skip, sortBy, sortOrder } = buildPaginationOptions(query);

  const where: Record<string, unknown> = {};
  if (userFilter) where.userId = userFilter;
  if (query.status) where.status = query.status;

  const [result, total] = await Promise.all([
    prisma.payment.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
    prisma.payment.count({ where }),
  ]);

  return { meta: buildMeta(page, limit, total), result };
};

export const PaymentService = { initiate, validateAndUpdate, markFailed, markCancelled, getById, getAll };
