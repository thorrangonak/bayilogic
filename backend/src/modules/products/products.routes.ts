import { Router } from 'express';
import { authenticate, requireAdmin, requireDealerOrAdmin } from '../../middleware/auth';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdatePrices,
  getProductsByCategory,
} from './products.controller';

const router = Router();

// Tüm route'lar auth gerektirir
router.use(authenticate);

// Ürün listeleme (herkes)
router.get('/', requireDealerOrAdmin, getProducts);
router.get('/category/:category', requireDealerOrAdmin, getProductsByCategory);
router.get('/:id', requireDealerOrAdmin, getProductById);

// Ürün yönetimi (sadece admin)
router.post('/', requireAdmin, createProduct);
router.put('/:id', requireAdmin, updateProduct);
router.delete('/:id', requireAdmin, deleteProduct);
router.post('/bulk-update-prices', requireAdmin, bulkUpdatePrices);

export default router;
