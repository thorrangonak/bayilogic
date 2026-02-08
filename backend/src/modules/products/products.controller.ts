import { Response } from 'express';
import { PrismaClient, ProductCategory } from '@prisma/client';
import { AuthRequest, ApiResponse } from '../../types';

const prisma = new PrismaClient();

// Ürünleri listele
export const getProducts = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { page = 1, limit = 50, search, category, system, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { code: { contains: String(search), mode: 'insensitive' } },
        { name: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category as ProductCategory;
    }

    if (system) {
      where.system = system;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ category: 'asc' }, { code: 'asc' }],
        skip,
        take: Number(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: 'Ürünler alınamadı',
    });
  }
};

// Kategoriye göre ürünler
export const getProductsByCategory = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { category } = req.params;
    const { system } = req.query;

    const where: any = {
      category: category as ProductCategory,
      isActive: true,
      deletedAt: null,
    };

    if (system) {
      where.system = system;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      error: 'Ürünler alınamadı',
    });
  }
};

// Ürün detayı
export const getProductById = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Ürün bulunamadı',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      error: 'Ürün alınamadı',
    });
  }
};

// Yeni ürün oluştur (Admin only)
export const createProduct = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const {
      code,
      name,
      description,
      category,
      system,
      unit,
      basePrice,
      currency,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      pricePerM2,
      laborCost,
    } = req.body;

    if (!code || !name || !category) {
      return res.status(400).json({
        success: false,
        error: 'Ürün kodu, adı ve kategori gerekli',
      });
    }

    // Kod benzersizlik kontrolü
    const existingProduct = await prisma.product.findFirst({
      where: { code, deletedAt: null },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        error: 'Bu ürün kodu zaten kullanımda',
      });
    }

    const product = await prisma.product.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        category,
        system,
        unit: unit || 'ADET',
        basePrice: basePrice || 0,
        currency: currency || 'TRY',
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        pricePerM2,
        laborCost,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Product',
        entityId: product.id,
        newValues: { code: product.code, name: product.name },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Ürün oluşturuldu',
      data: product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      error: 'Ürün oluşturulamadı',
    });
  }
};

// Ürün güncelle (Admin only)
export const updateProduct = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      system,
      unit,
      basePrice,
      currency,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      pricePerM2,
      laborCost,
      isActive,
    } = req.body;

    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Ürün bulunamadı',
      });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        category,
        system,
        unit,
        basePrice,
        currency,
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        pricePerM2,
        laborCost,
        isActive,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'Product',
        entityId: id,
        oldValues: { basePrice: product.basePrice },
        newValues: { basePrice: updated.basePrice },
      },
    });

    res.json({
      success: true,
      message: 'Ürün güncellendi',
      data: updated,
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      error: 'Ürün güncellenemedi',
    });
  }
};

// Ürün sil (Admin only, soft delete)
export const deleteProduct = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Ürün bulunamadı',
      });
    }

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE',
        entityType: 'Product',
        entityId: id,
        oldValues: { code: product.code, name: product.name },
      },
    });

    res.json({
      success: true,
      message: 'Ürün silindi',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      error: 'Ürün silinemedi',
    });
  }
};

// Toplu fiyat güncelleme (Admin only)
export const bulkUpdatePrices = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { updates, percentageChange, category } = req.body;

    if (updates && Array.isArray(updates)) {
      // Bireysel güncellemeler
      for (const update of updates) {
        await prisma.product.update({
          where: { id: update.id },
          data: { basePrice: update.basePrice },
        });
      }

      res.json({
        success: true,
        message: `${updates.length} ürün fiyatı güncellendi`,
      });
    } else if (percentageChange !== undefined) {
      // Yüzdelik artış/azalış
      const where: any = { deletedAt: null, isActive: true };
      if (category) {
        where.category = category;
      }

      const products = await prisma.product.findMany({ where });
      const multiplier = 1 + percentageChange / 100;

      for (const product of products) {
        await prisma.product.update({
          where: { id: product.id },
          data: { basePrice: Math.round(Number(product.basePrice) * multiplier * 100) / 100 },
        });
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'UPDATE',
          entityType: 'Product',
          entityId: 'BULK',
          newValues: {
            percentageChange,
            category: category || 'ALL',
            productsAffected: products.length,
          },
        },
      });

      res.json({
        success: true,
        message: `${products.length} ürün fiyatı %${percentageChange} ${percentageChange > 0 ? 'artırıldı' : 'azaltıldı'}`,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Güncelleme parametreleri gerekli',
      });
    }
  } catch (error) {
    console.error('Bulk update prices error:', error);
    res.status(500).json({
      success: false,
      error: 'Fiyatlar güncellenemedi',
    });
  }
};
