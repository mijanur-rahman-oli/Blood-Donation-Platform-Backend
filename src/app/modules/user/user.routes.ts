import { Router } from 'express';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import authenticate from '../../middlewares/authenticate';
import validateRequest from '../../middlewares/validateRequest';

const router = Router();

router.get('/me', authenticate(), UserController.getMe);
router.patch('/me', authenticate(), validateRequest(UserValidation.updateMe), UserController.updateMe);

export const UserRoutes = router;
