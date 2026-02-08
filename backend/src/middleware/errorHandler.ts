import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { config } from '../config';

// Custom Error Class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 Not Found Handler
export const notFoundHandler = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  res.status(404).json({
    success: false,
    error: `Endpoint bulunamadı: ${req.method} ${req.originalUrl}`,
  });
};

// Global Error Handler
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  console.error('❌ Error:', err);

  // Default values
  let statusCode = 500;
  let message = 'Sunucu hatası oluştu';

  // AppError instance
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;

    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Bu kayıt zaten mevcut';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Kayıt bulunamadı';
        break;
      default:
        message = 'Veritabanı hatası';
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Geçersiz token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token süresi dolmuş';
  }

  // Response
  const response: ApiResponse = {
    success: false,
    error: message,
  };

  // Include stack trace in development
  if (config.nodeEnv === 'development') {
    (response as any).stack = err.stack;
  }

  res.status(statusCode).json(response);
};
