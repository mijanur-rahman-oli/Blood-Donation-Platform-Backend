import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { PaymentValidation } from './payment.validation';
import authenticate from '../../middlewares/authenticate';
import validateRequest from '../../middlewares/validateRequest';

const router = Router();

router.post(
  '/initiate',
  authenticate(),
  validateRequest(PaymentValidation.initiate),
  PaymentController.initiate,
);

// The next four routes are called directly by the SSLCommerz gateway
// (server-to-server / browser redirect), so they are intentionally NOT
// behind authenticate().
router.post('/success', PaymentController.success);
router.post('/fail', PaymentController.fail);
router.post('/cancel', PaymentController.cancel);
router.post('/ipn', PaymentController.ipn);

router.get('/', authenticate(), PaymentController.getAll);
router.get('/:id', authenticate(), PaymentController.getById);

export const PaymentRoutes = router;
