import { Router } from 'express';
import { DonationController } from './donation.controller';
import authenticate from '../../middlewares/authenticate';
import authorize from '../../middlewares/authorize';
import { ROLES } from '../../constants';

const router = Router();

router.get('/', authenticate(), authorize(ROLES.ADMIN, ROLES.DONOR), DonationController.getAll);
router.get('/:id', authenticate(), authorize(ROLES.ADMIN, ROLES.DONOR), DonationController.getById);

export const DonationRoutes = router;
