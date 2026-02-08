import { PrismaClient, SystemType, ProductCategory } from '@prisma/client';
import {
  ProfileCalculation,
  AccessoryCalculation,
  QuoteCalculationResult,
  QuoteItemInput,
  ProfileMultiplier
} from '../types';

const prisma = new PrismaClient();

// Sistem konfigürasyonları (Excel'deki gibi)
const systemConfigs: Record<string, { defaultAccessories: string[] }> = {
  BYD100: {
    defaultAccessories: ['BYD10-114DK', 'BYD10-113SK', 'ZG0256', 'ZIP-REG-101', 'WB5-5'],
  },
  BYD125: {
    defaultAccessories: ['BYD10-114DK', 'BYD10-113SK', 'ZG0256', 'ZIP-REG-101', 'WB5-5'],
  },
  SKY1500: {
    defaultAccessories: ['SKY-YAY-001', 'SKY-MNT-001', 'ZG0256', 'WB5-5'],
  },
  SKY1600: {
    defaultAccessories: ['SKY-AMR-001', 'SKY-MNT-002', 'ZG0256', 'WB5-5'],
  },
};

/**
 * Teklif kalemi fiyat hesaplama
 * Excel formüllerinin birebir karşılığı
 */
export async function calculateQuoteItem(
  input: QuoteItemInput,
  profitMargin: number = 0,
  discountRate: number = 0
): Promise<QuoteCalculationResult> {
  const { systemType, width, height, quantity } = input;

  // mm -> metre dönüşümü
  const widthM = width / 1000;
  const heightM = height / 1000;

  // Profilleri getir
  const profiles = await prisma.product.findMany({
    where: {
      category: ProductCategory.PROFIL,
      system: systemType,
      isActive: true,
      deletedAt: null,
    },
  });

  // Profil hesaplamaları
  const profileResults: ProfileCalculation[] = [];
  let totalProfileKg = 0;
  let totalProfileCost = 0;

  for (const profile of profiles) {
    const multipliers = (profile.multipliers as ProfileMultiplier) || { widthMult: 1, heightMult: 0 };

    // Uzunluk hesabı (Excel formülü)
    const length = (multipliers.widthMult * widthM) + (multipliers.heightMult * heightM);

    // Toplam kg hesabı
    const gramaj = Number(profile.gramaj) || 0;
    const totalKg = gramaj * length * quantity;

    // Maliyet hesabı
    const unitPrice = Number(profile.basePrice);
    const totalPrice = totalKg * unitPrice;

    totalProfileKg += totalKg;
    totalProfileCost += totalPrice;

    profileResults.push({
      code: profile.code,
      name: profile.name,
      gramaj,
      length: length * quantity,
      totalKg,
      unitPrice,
      totalPrice,
    });
  }

  // Aparat hesaplamaları
  const config = systemConfigs[systemType] || { defaultAccessories: [] };
  const accessories = await prisma.product.findMany({
    where: {
      category: ProductCategory.APARAT,
      code: { in: config.defaultAccessories },
      isActive: true,
      deletedAt: null,
    },
  });

  const accessoryResults: AccessoryCalculation[] = [];
  let totalAccessoryCost = 0;

  for (const acc of accessories) {
    let qty: number;

    // Birime göre miktar hesabı
    if (acc.unit === 'mt') {
      // Fermuar için yükseklik × 2, diğerleri için genişlik
      if (acc.code.includes('ZIP')) {
        qty = heightM * 2 * quantity;
      } else {
        qty = widthM * quantity;
      }
    } else {
      // Adet bazlı (tk, ad)
      qty = quantity;

      // Fermuar kılavuzu 4 adet
      if (acc.code === 'ZG0256') {
        qty = 4 * quantity;
      }
    }

    const unitPrice = Number(acc.basePrice);
    const totalPrice = qty * unitPrice;

    totalAccessoryCost += totalPrice;

    accessoryResults.push({
      code: acc.code,
      name: acc.name,
      unit: acc.unit,
      quantity: qty,
      unitPrice,
      totalPrice,
    });
  }

  // Kumaş hesabı
  let fabricCost = 0;
  if (input.includeFabric && input.fabricPrice) {
    const m2 = widthM * heightM;
    const fabricQty = input.fabricQty || 1;
    fabricCost = m2 * fabricQty * input.fabricPrice * quantity;
  }

  // Motor hesabı
  let motorCost = 0;
  if (input.includeMotor) {
    if (input.motorPrice && input.motorQty) {
      motorCost += input.motorPrice * input.motorQty * quantity;
    }
    if (input.remotePrice && input.remoteQty) {
      motorCost += input.remotePrice * input.remoteQty * quantity;
    }
  }

  // Toplam hesaplama
  const subtotal = totalProfileCost + totalAccessoryCost + fabricCost + motorCost;

  // Kâr marjı ve indirim uygula
  let grandTotal = subtotal;

  if (profitMargin > 0) {
    grandTotal = subtotal * (1 + profitMargin / 100);
  }

  if (discountRate > 0) {
    grandTotal = grandTotal * (1 - discountRate / 100);
  }

  return {
    profiles: profileResults,
    accessories: accessoryResults,
    totalProfileKg,
    totalProfileCost,
    totalAccessoryCost,
    fabricCost,
    motorCost,
    subtotal,
    grandTotal,
  };
}

/**
 * Teklif numarası oluştur
 * Format: TKL-2024-0001
 */
export async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TKL-${year}-`;

  const lastQuote = await prisma.quote.findFirst({
    where: {
      quoteNumber: { startsWith: prefix },
    },
    orderBy: { quoteNumber: 'desc' },
  });

  let sequence = 1;
  if (lastQuote) {
    const lastNumber = parseInt(lastQuote.quoteNumber.split('-')[2], 10);
    sequence = lastNumber + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

/**
 * Sipariş numarası oluştur
 * Format: SIP-2024-0001
 */
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SIP-${year}-`;

  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: { startsWith: prefix },
    },
    orderBy: { orderNumber: 'desc' },
  });

  let sequence = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.orderNumber.split('-')[2], 10);
    sequence = lastNumber + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

/**
 * Bayi kodu oluştur
 * Format: BAY-001
 */
export async function generateDealerCode(): Promise<string> {
  const prefix = 'BAY-';

  const lastDealer = await prisma.dealer.findFirst({
    where: {
      code: { startsWith: prefix },
    },
    orderBy: { code: 'desc' },
  });

  let sequence = 1;
  if (lastDealer) {
    const lastNumber = parseInt(lastDealer.code.split('-')[1], 10);
    sequence = lastNumber + 1;
  }

  return `${prefix}${sequence.toString().padStart(3, '0')}`;
}
