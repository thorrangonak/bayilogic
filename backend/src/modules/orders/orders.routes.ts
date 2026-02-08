import { Router } from 'express';
import { authenticate, requireAdmin, requireDealerOrAdmin } from '../../middleware/auth';
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  getProductionRecipes,
  updateRecipeStatus,
  getOrderStats,
  updateOrderNotes,
} from './orders.controller';

const router = Router();

// Tüm route'lar auth gerektirir
router.use(authenticate);

// İstatistikler
router.get('/stats', requireDealerOrAdmin, getOrderStats);

// Siparişler
router.get('/', requireDealerOrAdmin, getOrders);
router.get('/:id', requireDealerOrAdmin, getOrderById);
router.put('/:id/status', requireAdmin, updateOrderStatus);
router.put('/:id/notes', requireDealerOrAdmin, updateOrderNotes);

// Üretim reçeteleri
router.get('/:id/recipes', requireDealerOrAdmin, getProductionRecipes);
router.put('/:id/recipes/:recipeId/status', requireAdmin, updateRecipeStatus);

export default router;
