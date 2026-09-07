import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      provider: true,
      phone: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
      donorProfile: true,
    },
  });

  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  return user;
};

const updateMe = async (userId: string, payload: { name?: string; phone?: string }) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: payload,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      updatedAt: true,
    },
  });
  return user;
};

export const UserService = { getMe, updateMe };
