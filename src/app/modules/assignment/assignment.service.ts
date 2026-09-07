import httpStatus from 'http-status';
import { AssignmentStatus, RequestStatus } from '@prisma/client';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import { AuditLogService } from '../auditLog/auditLog.service';
import { cacheDel } from '../../utils/redis';

// Ensures the logged-in donor user owns the DonorProfile behind this assignment.
const getOwnedAssignment = async (assignmentId: string, userId: string) => {
  const assignment = await prisma.donationAssignment.findUnique({
    where: { id: assignmentId },
    include: { donorProfile: true, bloodRequest: true },
  });

  if (!assignment) throw new AppError(httpStatus.NOT_FOUND, 'Assignment not found');

  if (assignment.donorProfile.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You can only update your own assignment');
  }

  return assignment;
};

const accept = async (assignmentId: string, userId: string) => {
  const assignment = await getOwnedAssignment(assignmentId, userId);

  if (assignment.status !== AssignmentStatus.PENDING) {
    throw new AppError(httpStatus.BAD_REQUEST, `Only PENDING assignments can be accepted (current: ${assignment.status})`);
  }

  const updated = await prisma.donationAssignment.update({
    where: { id: assignmentId },
    data: { status: AssignmentStatus.ACCEPTED, respondedAt: new Date() },
  });

  await AuditLogService.record({
    actorId: userId,
    action: 'ASSIGNMENT_ACCEPTED',
    entityType: 'DonationAssignment',
    entityId: assignmentId,
  });

  return updated;
};

const reject = async (assignmentId: string, userId: string, cancelReason?: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const assignment = await tx.donationAssignment.findUnique({
      where: { id: assignmentId },
      include: { donorProfile: true },
    });
    if (!assignment) throw new AppError(httpStatus.NOT_FOUND, 'Assignment not found');
    if (assignment.donorProfile.userId !== userId) {
      throw new AppError(httpStatus.FORBIDDEN, 'You can only update your own assignment');
    }
    if (![AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED].includes(assignment.status)) {
      throw new AppError(httpStatus.BAD_REQUEST, `Cannot reject an assignment in status ${assignment.status}`);
    }

    const updated = await tx.donationAssignment.update({
      where: { id: assignmentId },
      data: { status: AssignmentStatus.REJECTED, respondedAt: new Date(), cancelReason },
    });

    // Re-open the request so the admin can assign another donor.
    await tx.bloodRequest.update({
      where: { id: assignment.bloodRequestId },
      data: { status: RequestStatus.MATCHING },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: 'ASSIGNMENT_REJECTED',
        entityType: 'DonationAssignment',
        entityId: assignmentId,
        metadata: { cancelReason },
      },
    });

    return updated;
  });

  return result;
};

// Marks the donation complete: creates the DonationHistory record, updates the
// donor's totalDonations/lastDonationDate, and marks the request COMPLETED -
// all inside a single transaction to keep the aggregate consistent.
const complete = async (
  assignmentId: string,
  userId: string,
  payload: { unitsDonated: number; notes?: string },
) => {
  const result = await prisma.$transaction(async (tx) => {
    const assignment = await tx.donationAssignment.findUnique({
      where: { id: assignmentId },
      include: { donorProfile: true, bloodRequest: true },
    });
    if (!assignment) throw new AppError(httpStatus.NOT_FOUND, 'Assignment not found');
    if (assignment.donorProfile.userId !== userId) {
      throw new AppError(httpStatus.FORBIDDEN, 'You can only update your own assignment');
    }
    if (assignment.status !== AssignmentStatus.ACCEPTED) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Only ACCEPTED assignments can be completed (current: ${assignment.status})`,
      );
    }

    const now = new Date();

    const updatedAssignment = await tx.donationAssignment.update({
      where: { id: assignmentId },
      data: { status: AssignmentStatus.COMPLETED, completedAt: now },
    });

    const donation = await tx.donationHistory.create({
      data: {
        assignmentId,
        donorProfileId: assignment.donorProfileId,
        unitsDonated: payload.unitsDonated,
        donationDate: now,
        location: assignment.bloodRequest.location,
        notes: payload.notes,
      },
    });

    await tx.donorProfile.update({
      where: { id: assignment.donorProfileId },
      data: {
        totalDonations: { increment: 1 },
        lastDonationDate: now,
      },
    });

    await tx.bloodRequest.update({
      where: { id: assignment.bloodRequestId },
      data: { status: RequestStatus.COMPLETED },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: 'DONATION_COMPLETED',
        entityType: 'BloodRequest',
        entityId: assignment.bloodRequestId,
        metadata: { assignmentId, donationId: donation.id },
      },
    });

    return { assignment: updatedAssignment, donation };
  });

  await cacheDel('admin:dashboard:stats');
  return result;
};

const getById = async (assignmentId: string) => {
  const assignment = await prisma.donationAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      donorProfile: { include: { user: { select: { id: true, name: true, phone: true } } } },
      bloodRequest: true,
    },
  });
  if (!assignment) throw new AppError(httpStatus.NOT_FOUND, 'Assignment not found');
  return assignment;
};

export const AssignmentService = { accept, reject, complete, getById };
