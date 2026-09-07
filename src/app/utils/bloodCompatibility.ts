import { BloodGroup } from '@prisma/client';
import {
  DONOR_COMPATIBILITY_MAP,
  MAX_DONOR_AGE,
  MIN_DONATION_INTERVAL_DAYS,
  MIN_DONOR_AGE,
  MIN_DONOR_WEIGHT_KG,
} from '../constants';

/**
 * Returns true if a donor with `donorGroup` can donate to a recipient/request
 * that needs `recipientGroup`.
 */
export const isBloodCompatible = (
  donorGroup: BloodGroup,
  recipientGroup: BloodGroup,
): boolean => {
  const compatibleRecipients = DONOR_COMPATIBILITY_MAP[donorGroup] || [];
  return compatibleRecipients.includes(recipientGroup);
};

/**
 * Returns the list of blood groups that are compatible donors FOR a given recipient group.
 * Useful for building a Prisma `in` filter when searching for donors of a request.
 */
export const getCompatibleDonorGroups = (recipientGroup: BloodGroup): BloodGroup[] => {
  return (Object.keys(DONOR_COMPATIBILITY_MAP) as BloodGroup[]).filter((donorGroup) =>
    isBloodCompatible(donorGroup, recipientGroup),
  );
};

interface IEligibilityInput {
  isEligible: boolean;
  lastDonationDate: Date | null;
  ageYears: number | null;
  weightKg: number | null;
}

interface IEligibilityResult {
  eligible: boolean;
  reasons: string[];
}

/**
 * Central place for donor medical-eligibility rules (age, weight, donation interval).
 * Never scattered across controllers/services.
 */
export const evaluateDonorEligibility = (input: IEligibilityInput): IEligibilityResult => {
  const reasons: string[] = [];

  if (!input.isEligible) {
    reasons.push('Donor has been manually marked ineligible');
  }

  if (input.ageYears !== null) {
    if (input.ageYears < MIN_DONOR_AGE) reasons.push(`Donor is younger than ${MIN_DONOR_AGE} years`);
    if (input.ageYears > MAX_DONOR_AGE) reasons.push(`Donor is older than ${MAX_DONOR_AGE} years`);
  }

  if (input.weightKg !== null && input.weightKg < MIN_DONOR_WEIGHT_KG) {
    reasons.push(`Donor weighs less than ${MIN_DONOR_WEIGHT_KG}kg`);
  }

  if (input.lastDonationDate) {
    const daysSinceLastDonation = Math.floor(
      (Date.now() - new Date(input.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceLastDonation < MIN_DONATION_INTERVAL_DAYS) {
      reasons.push(
        `Donor must wait ${MIN_DONATION_INTERVAL_DAYS - daysSinceLastDonation} more day(s) since last donation`,
      );
    }
  }

  return { eligible: reasons.length === 0, reasons };
};
