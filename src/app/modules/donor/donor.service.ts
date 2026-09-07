import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import { buildMeta, buildPaginationOptions } from '../../utils/queryBuilder';
import { getCompatibleDonorGroups } from '../../utils/bloodCompatibility';
import { BloodGroup } from '@prisma/client';
import { cacheDel, cacheGet, cacheSet } from '../../utils/redis';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../../constants';

// Donor search results are cached per distinct query string. Any donor-data
// write below must invalidate the whole search cache namespace, since we
// can't know in advance which cached queries a given donor now matches.
const invalidateDonorSearchCache = () => cacheDel('donor:search:*');

interface ICreateDonorProfile {
  bloodGroup: BloodGroup;
  location: string;
  latitude?: number;
  longitude?: number;
  weightKg?: number;
  ageYears?: number;
  lastDonationDate?: string;
  medicalNotes?: string;
}

const createProfile = async (userId: string, payload: ICreateDonorProfile) => {
  const existing = await prisma.donorProfile.findUnique({ where: { userId } });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, 'Donor profile already exists for this user');
  }

  const profile = await prisma.donorProfile.create({
    data: {
      userId,
      bloodGroup: payload.bloodGroup,
      location: payload.location,
      latitude: payload.latitude,
      longitude: payload.longitude,
      weightKg: payload.weightKg,
      ageYears: payload.ageYears,
      lastDonationDate: payload.lastDonationDate ? new Date(payload.lastDonationDate) : undefined,
      medicalNotes: payload.medicalNotes,
    },
  });

  await invalidateDonorSearchCache();
  return profile;
};

const getMyProfile = async (userId: string) => {
  const profile = await prisma.donorProfile.findUnique({
    where: { userId, deletedAt: null },
  });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, 'Donor profile not found');
  return profile;
};

const updateMyProfile = async (userId: string, payload: Partial<ICreateDonorProfile> & { isEligible?: boolean }) => {
  const profile = await prisma.donorProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, 'Donor profile not found');

  const updated = await prisma.donorProfile.update({
    where: { userId },
    data: {
      ...payload,
      lastDonationDate: payload.lastDonationDate ? new Date(payload.lastDonationDate) : undefined,
    },
  });

  await invalidateDonorSearchCache();
  return updated;
};

const updateAvailability = async (userId: string, availability: boolean) => {
  const profile = await prisma.donorProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, 'Donor profile not found');

  const updated = await prisma.donorProfile.update({ where: { userId }, data: { availability } });
  await invalidateDonorSearchCache();
  return updated;
};

// List blood requests compatible with the logged-in donor's blood group, so
// the donor can see requests they are eligible to respond to.
const getMatchingRequests = async (userId: string, query: Record<string, unknown>) => {
  const profile = await prisma.donorProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, 'Donor profile not found');

  const { page, limit, skip, sortBy, sortOrder } = buildPaginationOptions(query);

  // A donor of group X can donate to a set of compatible recipient groups -
  // only show this donor requests whose needed bloodGroup they can fulfill.
  const compatibleGroups = getCompatibleDonorGroups(profile.bloodGroup);

  const finalWhere: Record<string, unknown> = {
    status: { in: ['VERIFIED', 'MATCHING'] },
    deletedAt: null,
    bloodGroup: { in: compatibleGroups },
  };

  const [result, total] = await Promise.all([
    prisma.bloodRequest.findMany({
      where: finalWhere,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.bloodRequest.count({ where: finalWhere }),
  ]);

  return { meta: buildMeta(page, limit, total), result };
};

const getMyDonationHistory = async (userId: string, query: Record<string, unknown>) => {
  const profile = await prisma.donorProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, 'Donor profile not found');

  const { page, limit, skip, sortBy, sortOrder } = buildPaginationOptions(query, 'donationDate');

  const where = { donorProfileId: profile.id };

  const [result, total] = await Promise.all([
    prisma.donationHistory.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { assignment: { include: { bloodRequest: true } } },
    }),
    prisma.donationHistory.count({ where }),
  ]);

  return { meta: buildMeta(page, limit, total), result };
};

// Reusable search used by admin/requester to find available compatible donors.
// Results are cached in Redis per distinct query string (60s TTL, see
// CACHE_TTL_SECONDS.DONOR_SEARCH) since this is a frequently-hit, read-heavy
// endpoint with a small, bounded set of realistic filter combinations. Cache
// is invalidated on any donor profile/availability write above. If Redis is
// unavailable, cacheGet/cacheSet fail soft and this just falls through to
// PostgreSQL on every call - never a hard dependency.
const searchDonors = async (query: Record<string, unknown>) => {
  const { page, limit, skip, sortBy, sortOrder } = buildPaginationOptions(query);

  const cacheKey = CACHE_KEYS.DONOR_SEARCH(JSON.stringify({ ...query, page, limit, sortBy, sortOrder }));
  const cached = await cacheGet<{ meta: unknown; result: unknown }>(cacheKey);
  if (cached) return cached;

  const where: Record<string, unknown> = { deletedAt: null };
  if (query.bloodGroup) where.bloodGroup = query.bloodGroup;
  if (query.availability !== undefined) where.availability = query.availability === 'true';
  if (query.isEligible !== undefined) where.isEligible = query.isEligible === 'true';
  if (query.location) where.location = { contains: query.location as string, mode: 'insensitive' };
  if (query.q) {
    where.location = { contains: query.q as string, mode: 'insensitive' };
  }

  const [result, total] = await Promise.all([
    prisma.donorProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    }),
    prisma.donorProfile.count({ where }),
  ]);

  const payload = { meta: buildMeta(page, limit, total), result };
  await cacheSet(cacheKey, payload, CACHE_TTL_SECONDS.DONOR_SEARCH);
  return payload;
};

export const DonorService = {
  createProfile,
  getMyProfile,
  updateMyProfile,
  updateAvailability,
  getMatchingRequests,
  getMyDonationHistory,
  searchDonors,
};
