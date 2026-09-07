import { z } from 'zod';

const updateRole = z.object({
  body: z.object({
    role: z.enum(['DONOR', 'REQUESTER', 'ADMIN'], { required_error: 'role is required' }),
  }),
});

const updateStatus = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'BLOCKED'], { required_error: 'status is required' }),
  }),
});

export const AdminValidation = { updateRole, updateStatus };
