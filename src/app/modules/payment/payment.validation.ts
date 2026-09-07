import { z } from 'zod';

const purposeEnum = z.enum([
  'EMERGENCY_VERIFICATION_FEE',
  'LOGISTICS_SUPPORT_FEE',
  'PLATFORM_COORDINATION_FEE',
]);

const initiate = z.object({
  body: z.object({
    bloodRequestId: z.string().uuid().optional(),
    purpose: purposeEnum,
    amount: z.number().positive().max(1000000),
    customerName: z.string().min(2).max(150),
    customerPhone: z.string().min(6).max(20),
  }),
});

export const PaymentValidation = { initiate };
