import { Router } from 'express';
import { authenticate, requireAdmin, requireDealerOrAdmin } from '../../middleware/auth';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  changePassword,
  deleteUser,
  getProfile,
  updateProfile,
} from './users.controller';

const router = Router();

// Tüm route'lar auth gerektirir
router.use(authenticate);

// Profil route'ları (herkes)
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/profile/password', (req, res, next) => {
  // Kendi şifresini değiştir
  req.params.id = (req as any).user.userId;
  return changePassword(req as any, res);
});

// Kullanıcı yönetimi
router.get('/', requireDealerOrAdmin, getUsers);
router.get('/:id', requireDealerOrAdmin, getUserById);
router.post('/', requireDealerOrAdmin, createUser);
router.put('/:id', requireDealerOrAdmin, updateUser);
router.put('/:id/password', requireAdmin, changePassword);
router.delete('/:id', requireDealerOrAdmin, deleteUser);

export default router;
