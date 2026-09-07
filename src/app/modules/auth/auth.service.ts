import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { OAuth2Client } from 'google-auth-library';
import { AuthProvider, Role } from '@prisma/client';
import config from '../../config';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AuditLogService } from '../auditLog/auditLog.service';

const googleClient = new OAuth2Client(config.google.clientId);

interface IRegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: 'DONOR' | 'REQUESTER';
  phone?: string;
}

const generateTokenPair = async (user: { id: string; email: string; role: Role }) => {
  const jwtPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(jwtPayload);
  const refreshToken = signRefreshToken(jwtPayload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  });

  return { accessToken, refreshToken };
};

const register = async (payload: IRegisterPayload) => {
  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, 'An account with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(payload.password, config.bcryptSaltRounds);

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      role: payload.role ?? Role.REQUESTER,
      phone: payload.phone,
      provider: AuthProvider.LOCAL,
    },
  });

  const tokens = await generateTokenPair(user);

  await AuditLogService.record({
    actorId: user.id,
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: user.id,
  });

  const { password: _password, ...safeUser } = user;
  return { user: safeUser, ...tokens };
};

const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }

  if (user.provider !== AuthProvider.LOCAL || !user.password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This account uses Google Sign-In. Please log in with Google',
    );
  }

  if (user.status === 'BLOCKED') {
    throw new AppError(httpStatus.FORBIDDEN, 'This account has been blocked');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }

  const tokens = await generateTokenPair(user);

  const { password: _password, ...safeUser } = user;
  return { user: safeUser, ...tokens };
};

const googleLogin = async (idToken: string, role?: 'DONOR' | 'REQUESTER') => {
  let ticketPayload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });
    ticketPayload = ticket.getPayload();
  } catch {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid Google token');
  }

  if (!ticketPayload || !ticketPayload.email) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Google token did not contain a valid email');
  }

  let user = await prisma.user.findUnique({ where: { email: ticketPayload.email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: ticketPayload.name || ticketPayload.email.split('@')[0],
        email: ticketPayload.email,
        googleId: ticketPayload.sub,
        provider: AuthProvider.GOOGLE,
        role: role ?? Role.REQUESTER,
        isEmailVerified: !!ticketPayload.email_verified,
      },
    });

    await AuditLogService.record({
      actorId: user.id,
      action: 'USER_REGISTERED_GOOGLE',
      entityType: 'User',
      entityId: user.id,
    });
  } else if (user.status === 'BLOCKED') {
    throw new AppError(httpStatus.FORBIDDEN, 'This account has been blocked');
  } else if (!user.googleId) {
    // Existing local account signing in with Google for the first time - link it.
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: ticketPayload.sub, provider: AuthProvider.GOOGLE },
    });
  }

  const tokens = await generateTokenPair(user);
  const { password: _password, ...safeUser } = user;
  return { user: safeUser, ...tokens };
};

const refreshTokenService = async (token: string) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired refresh token');
  }

  const storedToken = await prisma.refreshToken.findUnique({ where: { token } });

  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Refresh token is invalid or has been revoked');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || user.deletedAt || user.status === 'BLOCKED') {
    throw new AppError(httpStatus.UNAUTHORIZED, 'User no longer has access');
  }

  // Rotate refresh token: revoke the old one, issue a new pair.
  await prisma.refreshToken.update({ where: { token }, data: { revoked: true } });

  const tokens = await generateTokenPair(user);
  return tokens;
};

const logout = async (token: string) => {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revoked: true },
  });
  return null;
};

export const AuthService = {
  register,
  login,
  googleLogin,
  refreshToken: refreshTokenService,
  logout,
};
