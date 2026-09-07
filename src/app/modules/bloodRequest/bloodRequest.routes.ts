import { Router } from 'express';
import { BloodRequestController } from './bloodRequest.controller';
import { BloodRequestValidation } from './bloodRequest.validation';
import authenticate from '../../middlewares/authenticate';
import authorize from '../../middlewares/authorize';
import validateRequest from '../../middlewares/validateRequest';
import { ROLES } from '../../constants';

const router = Router();

router.post(
  '/',
  authenticate(),
  authorize(ROLES.REQUESTER, ROLES.ADMIN),
  validateRequest(BloodRequestValidation.createRequest),
  BloodRequestController.createRequest,
);

// Supports ?page=&limit=&status=&bloodGroup=&priority=&sortBy=&sortOrder=
router.get('/', authenticate(), BloodRequestController.getAll);

router.get('/search', authenticate(), BloodRequestController.search);

router.get('/:id', authenticate(), BloodRequestController.getById);

router.patch(
  '/:id',
  authenticate(),
  authorize(ROLES.REQUESTER, ROLES.ADMIN),
  validateRequest(BloodRequestValidation.updateRequest),
  BloodRequestController.update,
);

router.delete(
  '/:id',
  authenticate(),
  authorize(ROLES.REQUESTER, ROLES.ADMIN),
  BloodRequestController.cancel,
);

router.patch(
  '/:id/verify',
  authenticate(),
  authorize(ROLES.ADMIN),
  BloodRequestController.verify,
);

router.get(
  '/:id/matches',
  authenticate(),
  authorize(ROLES.ADMIN, ROLES.REQUESTER),
  BloodRequestController.getMatches,
);

router.post(
  '/:id/assign-donor',
  authenticate(),
  authorize(ROLES.ADMIN),
  validateRequest(BloodRequestValidation.assignDonor),
  BloodRequestController.assignDonor,
);

export const BloodRequestRoutes = router;
