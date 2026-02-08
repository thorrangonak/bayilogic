import { Request } from 'express';
import { User, Dealer } from '@prisma/client';

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  dealerId?: string;
}

// Extended Request with user
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// API Response
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Quote Calculation
export interface ProfileCalculation {
  code: string;
  name: string;
  gramaj: number;
  length: number;
  totalKg: number;
  unitPrice: number;
  totalPrice: number;
}

export interface AccessoryCalculation {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface QuoteCalculationResult {
  profiles: ProfileCalculation[];
  accessories: AccessoryCalculation[];
  totalProfileKg: number;
  totalProfileCost: number;
  totalAccessoryCost: number;
  fabricCost: number;
  motorCost: number;
  subtotal: number;
  grandTotal: number;
}

// System Config (Profile Multipliers)
export interface ProfileMultiplier {
  widthMult: number;
  heightMult: number;
}

export interface SystemConfig {
  name: string;
  nameEn: string;
  defaultAccessories: string[];
}

// Quote Item Input
export interface QuoteItemInput {
  systemType: string;
  width: number;
  height: number;
  quantity: number;
  paintCode?: string;
  includeFabric?: boolean;
  fabricPrice?: number;
  fabricQty?: number;
  includeMotor?: boolean;
  motorType?: string;
  motorPrice?: number;
  motorQty?: number;
  remoteType?: string;
  remotePrice?: number;
  remoteQty?: number;
}
