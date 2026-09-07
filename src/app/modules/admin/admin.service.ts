import httpStatus from 'http-status';
import { Role, UserStatus } from '@prisma/client';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import { buildExactFilters, buildMeta, buildPaginationOptions } from '../../utils/queryBuilder';
import { AuditLogService } from '../auditLog/auditLog.service';
import { cacheGet, cacheSet } from '../../utils/redis';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../../constants';

const getAllUsers = async (query: Record<string, unknown>) => {
  const { page, limit, skip, sortBy, sortOrder } = buildPaginationOptions(query);

  const where: Record<string, unknown> = {
    deletedAt: null,
    ...buildExactFilters(query, ['role', 'status']),
  };

  if (query.q) {
    where.OR = [
      { name: { contains: query.q as string, mode: 'insensitive' } },
      { email: { contains: query.q as string, mode: 'insensitive' } },
    ];
  }

  const [result, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        provider: true,
        phone: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { meta: buildMeta(page, limit, total), result };
};

const updateUserRole = async (targetUserId: string, role: Role, adminId: string) => {
  const user = await prisma.user.findFirst({ where: { id: targetUserId, deletedAt: null } });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const updated = await prisma.user.update({ where: { id: targetUserId }, data: { role } });

  await AuditLogService.record({
    actorId: adminId,
    action: 'USER_ROLE_CHANGED',
    entityType: 'User',
    entityId: targetUserId,
    metadata: { previousRole: user.role, newRole: role },
  });

  const { password: _password, ...safeUser } = updated;
  return safeUser;
};

const updateUserStatus = async (targetUserId: string, status: UserStatus, adminId: string) => {
  const user = await prisma.user.findFirst({ where: { id: targetUserId, deletedAt: null } });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const updated = await prisma.user.update({ where: { id: targetUserId }, data: { status } });

  await AuditLogService.record({
    actorId: adminId,
    action: 'USER_STATUS_CHANGED',
    entityType: 'User',
    entityId: targetUserId,
    metadata: { previousStatus: user.status, newStatus: status },
  });

  const { password: _password, ...safeUser } = updated;
  return safeUser;
};

const getDashboardStats = async () => {
  const cached = await cacheGet(CACHE_KEYS.DASHBOARD_STATS);
  if (cached) return cached;

  const [
    totalUsers,
    totalDonors,
    totalRequesters,
    totalBloodRequests,
    pendingRequests,
    completedRequests,
    totalDonations,
    totalPayments,
    totalRevenue,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, role: Role.DONOR } }),
    prisma.user.count({ where: { deletedAt: null, role: Role.REQUESTER } }),
    prisma.bloodRequest.count({ where: { deletedAt: null } }),
    prisma.bloodRequest.count({ where: { deletedAt: null, status: 'PENDING' } }),
    prisma.bloodRequest.count({ where: { deletedAt: null, status: 'COMPLETED' } }),
    prisma.donationHistory.count(),
    prisma.payment.count({ where: { status: 'PAID' } }),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
  ]);

  const stats = {
    totalUsers,
    totalDonors,
    totalRequesters,
    totalBloodRequests,
    pendingRequests,
    completedRequests,
    totalDonations,
    totalPayments,
    totalRevenue: totalRevenue._sum.amount || 0,
    generatedAt: new Date().toISOString(),
  };

  await cacheSet(CACHE_KEYS.DASHBOARD_STATS, stats, CACHE_TTL_SECONDS.DASHBOARD_STATS);
  return stats;
};

export const AdminService = { getAllUsers, updateUserRole, updateUserStatus, getDashboardStats };
