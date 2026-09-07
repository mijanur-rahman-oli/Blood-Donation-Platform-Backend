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

const createProfile = z.object({
  body: z.object({
    bloodGroup: bloodGroupEnum,
    location: z.string().min(2).max(150),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    weightKg: z.number().min(20).max(300).optional(),
    ageYears: z.number().int().min(16).max(100).optional(),
    lastDonationDate: z.string().datetime().optional(),
    medicalNotes: z.string().max(1000).optional(),
  }),
});

const updateProfile = z.object({
  body: z.object({
    location: z.string().min(2).max(150).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    weightKg: z.number().min(20).max(300).optional(),
    ageYears: z.number().int().min(16).max(100).optional(),
    lastDonationDate: z.string().datetime().optional(),
    medicalNotes: z.string().max(1000).optional(),
    isEligible: z.boolean().optional(),
  }),
});

const updateAvailability = z.object({
  body: z.object({
    availability: z.boolean({ required_error: 'availability is required' }),
  }),
});

export const DonorValidation = { createProfile, updateProfile, updateAvailability };
