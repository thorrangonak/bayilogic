import { Router } from 'express';
import { authenticate, requireDealerOrAdmin } from '../../middleware/auth';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
} from './customers.controller';

const router = Router();

// Tüm route'lar auth gerektirir
router.use(authenticate);
router.use(requireDealerOrAdmin);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.get('/:id/stats', getCustomerStats);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
