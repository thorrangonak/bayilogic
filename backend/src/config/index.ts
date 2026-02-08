import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // App
  app: {
    name: 'BAYEDİ ERP',
    version: '1.0.0',
  },
};

export default config;
