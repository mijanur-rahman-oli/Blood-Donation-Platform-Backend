import httpStatus from 'http-status';
import { BloodGroup, Priority, RequestStatus } from '@prisma/client';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import { buildMeta, buildPaginationOptions } from '../../utils/queryBuilder';
import { evaluateDonorEligibility, getCompatibleDonorGroups } from '../../utils/bloodCompatibility';
import { AuditLogService } from '../auditLog/auditLog.service';
import { cacheDel } from '../../utils/redis';

interface ICreateRequest {
  patientName: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  hospitalName: string;
  location: string;
  latitude?: number;
  longitude?: number;
  priority?: Priority;
  neededBy?: string;
  contactPhone: string;
  notes?: string;
}

const createRequest = async (requesterId: string, payload: ICreateRequest) => {
  const request = await prisma.bloodRequest.create({
    data: {
      requesterId,
      patientName: payload.patientName,
      bloodGroup: payload.bloodGroup,
      unitsNeeded: payload.unitsNeeded,
      hospitalName: payload.hospitalName,
      location: payload.location,
      latitude: payload.latitude,
      longitude: payload.longitude,
      priority: payload.priority ?? Priority.NORMAL,
      neededBy: payload.neededBy ? new Date(payload.neededBy) : undefined,
      contactPhone: payload.contactPhone,
      notes: payload.notes,
    },
  });

  await AuditLogService.record({
    actorId: requesterId,
    action: 'BLOOD_REQUEST_CREATED',
    entityType: 'BloodRequest',
    entityId: request.id,
  });

  return request;
};

const getAll = async (query: Record<string, unknown>, requesterFilter?: string) => {
  const { page, limit, skip, sortBy, sortOrder } = buildPaginationOptions(query);

  const where: Record<string, unknown> = { deletedAt: null };
  if (query.status) where.status = query.status;
  if (query.bloodGroup) where.bloodGroup = query.bloodGroup;
  if (query.priority) where.priority = query.priority;
  if (requesterFilter) where.requesterId = requesterFilter;

  const [result, total] = await Promise.all([
    prisma.bloodRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { requester: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.bloodRequest.count({ where }),
  ]);

  return { meta: buildMeta(page, limit, total), result };
};

const search = async (query: Record<string, unknown>) => {
  const { page, limit, skip, sortBy, sortOrder } = buildPaginationOptions(query);
  const q = (query.q as string) || '';

  const where: Record<string, unknown> = {
    deletedAt: null,
    OR: [
      { patientName: { contains: q, mode: 'insensitive' } },
      { hospitalName: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
    ],
  };

  const [result, total] = await Promise.all([
    prisma.bloodRequest.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
    prisma.bloodRequest.count({ where }),
  ]);

  return { meta: buildMeta(page, limit, total), result };
};

const getById = async (id: string) => {
  const request = await prisma.bloodRequest.findFirst({
    where: { id, deletedAt: null },
    include: {
      requester: { select: { id: true, name: true, phone: true, email: true } },
      assignments: { include: { donorProfile: { include: { user: { select: { name: true, phone: true } } } } } },
    },
  });
  if (!request) throw new AppError(httpStatus.NOT_FOUND, 'Blood request not found');
  return request;
};

const ensureModifiable = (status: RequestStatus) => {
  if (status === RequestStatus.COMPLETED || status === RequestStatus.CANCELLED) {
    throw new AppError(httpStatus.BAD_REQUEST, `Cannot modify a request that is already ${status}`);
  }
};

const update = async (id: string, requesterId: string, isAdmin: boolean, payload: Partial<ICreateRequest>) => {
  const request = await prisma.bloodRequest.findFirst({ where: { id, deletedAt: null } });
  if (!request) throw new AppError(httpStatus.NOT_FOUND, 'Blood request not found');

  if (!isAdmin && request.requesterId !== requesterId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You can only update your own blood requests');
  }

  ensureModifiable(request.status);

  const updated = await prisma.bloodRequest.update({
    where: { id },
    data: {
      ...payload,
      neededBy: payload.neededBy ? new Date(payload.neededBy) : undefined,
    },
  });

  return updated;
};

// Soft delete = cancel the request.
const cancel = async (id: string, requesterId: string, isAdmin: boolean) => {
  const request = await prisma.bloodRequest.findFirst({ where: { id, deletedAt: null } });
  if (!request) throw new AppError(httpStatus.NOT_FOUND, 'Blood request not found');

  if (!isAdmin && request.requesterId !== requesterId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You can only cancel your own blood requests');
  }

  ensureModifiable(request.status);

  const updated = await prisma.bloodRequest.update({
    where: { id },
    data: { status: RequestStatus.CANCELLED, deletedAt: new Date() },
  });

  await AuditLogService.record({
    actorId: requesterId,
    action: 'BLOOD_REQUEST_CANCELLED',
    entityType: 'BloodRequest',
    entityId: id,
  });

  return updated;
};

// Only ADMIN can verify a request, moving it from PENDING -> VERIFIED so it
// becomes eligible for donor matching.
const verify = async (id: string, adminId: string) => {
  const request = await prisma.bloodRequest.findFirst({ where: { id, deletedAt: null } });
  if (!request) throw new AppError(httpStatus.NOT_FOUND, 'Blood request not found');

  if (request.status !== RequestStatus.PENDING) {
    throw new AppError(httpStatus.BAD_REQUEST, `Only PENDING requests can be verified (current: ${request.status})`);
  }

  const updated = await prisma.bloodRequest.update({
    where: { id },
    data: { status: RequestStatus.VERIFIED, verifiedById: adminId, verifiedAt: new Date() },
  });

  await AuditLogService.record({
    actorId: adminId,
    action: 'BLOOD_REQUEST_VERIFIED',
    entityType: 'BloodRequest',
    entityId: id,
  });

  return updated;
};

// Finds compatible, available, eligible donors for a request - filtered by
// blood compatibility, availability, and medical eligibility rules.
const getMatches = async (id: string) => {
  const request = await prisma.bloodRequest.findFirst({ where: { id, deletedAt: null } });
  if (!request) throw new AppError(httpStatus.NOT_FOUND, 'Blood request not found');

  const compatibleGroups = getCompatibleDonorGroups(request.bloodGroup);

  const candidates = await prisma.donorProfile.findMany({
    where: {
      deletedAt: null,
      bloodGroup: { in: compatibleGroups },
      availability: true,
      isEligible: true,
    },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });

  const eligible = candidates.filter((donor) => {
    const evaluation = evaluateDonorEligibility({
      isEligible: donor.isEligible,
      lastDonationDate: donor.lastDonationDate,
      ageYears: donor.ageYears,
      weightKg: donor.weightKg,
    });
    return evaluation.eligible;
  });

  return eligible;
};

// Assigns a donor to a request inside a transaction to prevent race
// conditions such as double-booking the same donor to two active requests.
const assignDonor = async (requestId: string, donorProfileId: string, adminId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.bloodRequest.findFirst({ where: { id: requestId, deletedAt: null } });
    if (!request) throw new AppError(httpStatus.NOT_FOUND, 'Blood request not found');

    if (![RequestStatus.VERIFIED, RequestStatus.MATCHING].includes(request.status)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Only VERIFIED or MATCHING requests can have donors assigned (current: ${request.status})`,
      );
    }

    const donor = await tx.donorProfile.findFirst({ where: { id: donorProfileId, deletedAt: null } });
    if (!donor) throw new AppError(httpStatus.NOT_FOUND, 'Donor profile not found');

    if (!donor.availability || !donor.isEligible) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Donor is not currently available or eligible');
    }

    const compatible = getCompatibleDonorGroups(request.bloodGroup).includes(donor.bloodGroup);
    if (!compatible) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Donor blood group is not compatible with this request');
    }

    // Prevent a donor being assigned to multiple simultaneously-active requests.
    const activeAssignment = await tx.donationAssignment.findFirst({
      where: {
        donorProfileId,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });
    if (activeAssignment) {
      throw new AppError(httpStatus.CONFLICT, 'Donor already has an active assignment');
    }

    // Prevent duplicate assignment of the same donor to the same request.
    const duplicate = await tx.donationAssignment.findUnique({
      where: { bloodRequestId_donorProfileId: { bloodRequestId: requestId, donorProfileId } },
    });
    if (duplicate) {
      throw new AppError(httpStatus.CONFLICT, 'This donor is already assigned to this request');
    }

    const assignment = await tx.donationAssignment.create({
      data: { bloodRequestId: requestId, donorProfileId },
    });

    await tx.bloodRequest.update({ where: { id: requestId }, data: { status: RequestStatus.ASSIGNED } });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: 'DONOR_ASSIGNED',
        entityType: 'BloodRequest',
        entityId: requestId,
        metadata: { donorProfileId, assignmentId: assignment.id },
      },
    });

    return assignment;
  });

  await cacheDel('admin:dashboard:stats');
  return result;
};

export const BloodRequestService = {
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
