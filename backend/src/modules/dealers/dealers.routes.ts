import { Router } from 'express';
import { authenticate, requireAdmin, requireDealerOrAdmin } from '../../middleware/auth';
import {
  getDealers,
  getDealerById,
  createDealer,
  updateDealer,
  deleteDealer,
  getDealerUsers,
  getDealerStats,
} from './dealers.controller';

const router = Router();

// Tüm route'lar auth gerektirir
router.use(authenticate);

// Bayi listesi (admin ve bayiler için)
router.get('/', requireDealerOrAdmin, getDealers);
router.get('/:id', requireDealerOrAdmin, getDealerById);
router.get('/:id/users', requireDealerOrAdmin, getDealerUsers);
router.get('/:id/stats', requireDealerOrAdmin, getDealerStats);

// Bayi yönetimi (sadece admin)
router.post('/', requireAdmin, createDealer);
router.put('/:id', requireAdmin, updateDealer);
router.delete('/:id', requireAdmin, deleteDealer);

export default router;
