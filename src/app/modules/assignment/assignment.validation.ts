import { z } from 'zod';

const reject = z.object({
  body: z.object({
    cancelReason: z.string().max(500).optional(),
  }),
});

const complete = z.object({
  body: z.object({
    unitsDonated: z.number().int().min(1).max(10).default(1),
    notes: z.string().max(1000).optional(),
  }),
});

export const AssignmentValidation = { reject, complete };
