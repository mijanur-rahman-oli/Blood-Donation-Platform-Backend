import { z } from 'zod';

const updateMe = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(6).max(20).optional(),
  }),
});

export const UserValidation = { updateMe };
