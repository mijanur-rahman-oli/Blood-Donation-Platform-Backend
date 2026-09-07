import { Router } from 'express';
import { AdminController } from './admin.controller';
import { AdminValidation } from './admin.validation';
import authenticate from '../../middlewares/authenticate';
import authorize from '../../middlewares/authorize';
import validateRequest from '../../middlewares/validateRequest';
import { ROLES } from '../../constants';

const router = Router();

router.use(authenticate(), authorize(ROLES.ADMIN));

router.get('/users', AdminController.getAllUsers);
router.patch('/users/:id/role', validateRequest(AdminValidation.updateRole), AdminController.updateUserRole);
router.patch('/users/:id/status', validateRequest(AdminValidation.updateStatus), AdminController.updateUserStatus);
router.get('/dashboard-stats', AdminController.getDashboardStats);
router.get('/audit-logs', AdminController.getAuditLogs);
router.get('/blood-requests', AdminController.getAllBloodRequests);

export const AdminRoutes = router;
