import { z } from 'zod';

const register = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).min(2).max(100),
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(72),
    role: z.enum(['DONOR', 'REQUESTER']).optional(),
    phone: z.string().min(6).max(20).optional(),
  }),
});

const login = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email(),
    password: z.string({ required_error: 'Password is required' }),
  }),
});

const refreshToken = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: 'Refresh token is required' }),
  }),
});

const googleLogin = z.object({
  body: z.object({
    idToken: z.string({ required_error: 'Google idToken is required' }),
    role: z.enum(['DONOR', 'REQUESTER']).optional(),
  }),
});

export const AuthValidation = { register, login, refreshToken, googleLogin };
