import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import { buildMeta, buildPaginationOptions } from '../../utils/queryBuilder';

const getAll = async (query: Record<string, unknown>) => {
  const { page, limit, skip, sortBy, sortOrder } = buildPaginationOptions(query, 'donationDate');

  const where: Record<string, unknown> = {};
  if (query.donorProfileId) where.donorProfileId = query.donorProfileId;

  const [result, total] = await Promise.all([
    prisma.donationHistory.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        donorProfile: { include: { user: { select: { id: true, name: true, phone: true } } } },
        assignment: { include: { bloodRequest: true } },
      },
    }),
    prisma.donationHistory.count({ where }),
  ]);

  return { meta: buildMeta(page, limit, total), result };
};

const getById = async (id: string) => {
  const donation = await prisma.donationHistory.findUnique({
    where: { id },
    include: {
      donorProfile: { include: { user: { select: { id: true, name: true, phone: true } } } },
      assignment: { include: { bloodRequest: true } },
    },
  });
  if (!donation) throw new AppError(httpStatus.NOT_FOUND, 'Donation record not found');
  return donation;
};

export const DonationService = { getAll, getById };
