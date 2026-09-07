import { Router } from 'express';
import { DonorController } from './donor.controller';
import { DonorValidation } from './donor.validation';
import authenticate from '../../middlewares/authenticate';
import authorize from '../../middlewares/authorize';
import validateRequest from '../../middlewares/validateRequest';
import { ROLES } from '../../constants';

const router = Router();

// Search is open to authenticated REQUESTER/ADMIN so they can find donors.
router.get(
  '/search',
  authenticate(),
  authorize(ROLES.ADMIN, ROLES.REQUESTER),
  DonorController.searchDonors,
);

router.post(
  '/profile',
  authenticate(),
  authorize(ROLES.DONOR),
  validateRequest(DonorValidation.createProfile),
  DonorController.createProfile,
);

router.get('/profile', authenticate(), authorize(ROLES.DONOR), DonorController.getMyProfile);

router.patch(
  '/profile',
  authenticate(),
  authorize(ROLES.DONOR),
  validateRequest(DonorValidation.updateProfile),
  DonorController.updateMyProfile,
);

router.patch(
  '/availability',
  authenticate(),
  authorize(ROLES.DONOR),
  validateRequest(DonorValidation.updateAvailability),
  DonorController.updateAvailability,
);

router.get(
  '/requests',
  authenticate(),
  authorize(ROLES.DONOR),
  DonorController.getMatchingRequests,
);

router.get(
  '/donation-history',
  authenticate(),
  authorize(ROLES.DONOR),
  DonorController.getMyDonationHistory,
);

export const DonorRoutes = router;
