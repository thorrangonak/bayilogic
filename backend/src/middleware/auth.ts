import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthRequest, JwtPayload, ApiResponse } from '../types';

// JWT Token Doğrulama
export const authenticate = (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Yetkilendirme başlığı bulunamadı',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Geçersiz veya süresi dolmuş token',
    });
  }
};

// Admin Yetkisi Kontrolü
export const requireAdmin = (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Bu işlem için admin yetkisi gerekli',
    });
  }
  next();
};

// Bayi veya Admin Yetkisi
export const requireDealerOrAdmin = (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'DEALER')) {
    return res.status(403).json({
      success: false,
      error: 'Bu işlem için yetkiniz yok',
    });
  }
  next();
};

// Kendi Verisine Erişim (Bayi sadece kendi verisini görür)
export const requireOwnData = (dealerIdField: string = 'dealerId') => {
  return (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Yetkilendirme gerekli',
      });
    }

    // Admin her şeyi görebilir
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Bayi sadece kendi verisini görebilir
    const requestedDealerId = req.params[dealerIdField] || req.body[dealerIdField] || req.query[dealerIdField];

    if (requestedDealerId && requestedDealerId !== req.user.dealerId) {
      return res.status(403).json({
        success: false,
        error: 'Bu veriye erişim yetkiniz yok',
      });
    }

    next();
  };
};
