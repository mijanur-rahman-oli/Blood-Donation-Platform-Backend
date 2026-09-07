import { z } from 'zod';

const bloodGroupEnum = z.enum([
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
]);

const priorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']);

const createRequest = z.object({
  body: z.object({
    patientName: z.string().min(2).max(150),
    bloodGroup: bloodGroupEnum,
    unitsNeeded: z.number().int().min(1).max(20).default(1),
    hospitalName: z.string().min(2).max(200),
    location: z.string().min(2).max(150),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    priority: priorityEnum.optional(),
    neededBy: z.string().datetime().optional(),
    contactPhone: z.string().min(6).max(20),
    notes: z.string().max(1000).optional(),
  }),
});

const updateRequest = z.object({
  body: z.object({
    patientName: z.string().min(2).max(150).optional(),
    unitsNeeded: z.number().int().min(1).max(20).optional(),
    hospitalName: z.string().min(2).max(200).optional(),
    location: z.string().min(2).max(150).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    priority: priorityEnum.optional(),
    neededBy: z.string().datetime().optional(),
    contactPhone: z.string().min(6).max(20).optional(),
    notes: z.string().max(1000).optional(),
  }),
});

const assignDonor = z.object({
  body: z.object({
    donorProfileId: z.string({ required_error: 'donorProfileId is required' }).uuid(),
  }),
});

export const BloodRequestValidation = { createRequest, updateRequest, assignDonor };
