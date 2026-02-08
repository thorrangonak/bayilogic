import { Router } from 'express';
import { login, logout, me, changePassword, refreshToken } from './auth.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);
router.post('/refresh', refreshToken);

export default router;
