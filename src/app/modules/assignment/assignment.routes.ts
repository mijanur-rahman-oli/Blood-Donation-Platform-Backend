import { Router } from 'express';
import { AssignmentController } from './assignment.controller';
import { AssignmentValidation } from './assignment.validation';
import authenticate from '../../middlewares/authenticate';
import authorize from '../../middlewares/authorize';
import validateRequest from '../../middlewares/validateRequest';
import { ROLES } from '../../constants';

const router = Router();

router.get('/:id', authenticate(), AssignmentController.getById);

router.patch('/:id/accept', authenticate(), authorize(ROLES.DONOR), AssignmentController.accept);

router.patch(
  '/:id/reject',
  authenticate(),
  authorize(ROLES.DONOR),
  validateRequest(AssignmentValidation.reject),
  AssignmentController.reject,
);

router.patch(
  '/:id/complete',
  authenticate(),
  authorize(ROLES.DONOR),
  validateRequest(AssignmentValidation.complete),
  AssignmentController.complete,
);

export const AssignmentRoutes = router;
