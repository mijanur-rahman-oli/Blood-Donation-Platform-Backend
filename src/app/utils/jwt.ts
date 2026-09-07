import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../config';

export interface IJwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const signAccessToken = (payload: IJwtPayload): string => {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  } as SignOptions);
};

export const signRefreshToken = (payload: IJwtPayload): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): IJwtPayload => {
  return jwt.verify(token, config.jwt.accessSecret) as IJwtPayload;
};

export const verifyRefreshToken = (token: string): IJwtPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as IJwtPayload;
};
