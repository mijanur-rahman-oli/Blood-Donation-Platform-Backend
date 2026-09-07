import { Router } from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { UserRoutes } from '../modules/user/user.routes';
import { DonorRoutes } from '../modules/donor/donor.routes';
import { BloodRequestRoutes } from '../modules/bloodRequest/bloodRequest.routes';
import { AssignmentRoutes } from '../modules/assignment/assignment.routes';
import { DonationRoutes } from '../modules/donation/donation.routes';
import { PaymentRoutes } from '../modules/payment/payment.routes';
import { AdminRoutes } from '../modules/admin/admin.routes';

const router = Router();

const moduleRoutes = [
  { path: '/auth', route: AuthRoutes },
  { path: '/users', route: UserRoutes },
  { path: '/donors', route: DonorRoutes },
  { path: '/blood-requests', route: BloodRequestRoutes },
  { path: '/assignments', route: AssignmentRoutes },
  { path: '/donations', route: DonationRoutes },
  { path: '/payments', route: PaymentRoutes },
  { path: '/admin', route: AdminRoutes },
];

moduleRoutes.forEach((moduleRoute) => router.use(moduleRoute.path, moduleRoute.route));

export default router;
