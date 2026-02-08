import { Response } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { AuthRequest, ApiResponse } from '../../types';

const prisma = new PrismaClient();

// Siparişleri listele
export const getOrders = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { page = 1, limit = 20, status, dealerId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    // Bayi sadece kendi siparişlerini görür
    if (req.user?.role === 'DEALER' && req.user.dealerId) {
      where.dealerId = req.user.dealerId;
    } else if (dealerId) {
      where.dealerId = dealerId;
    }

    if (status) {
      where.status = status as OrderStatus;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          dealer: { select: { id: true, code: true, companyName: true } },
          quote: {
            select: {
              id: true,
              quoteNumber: true,
              customer: { select: { id: true, companyName: true } },
            },
          },
          _count: { select: { recipes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Siparişler alınamadı',
    });
  }
};

// Sipariş detayı
export const getOrderById = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const where: any = { id };
    if (req.user?.role === 'DEALER' && req.user.dealerId) {
      where.dealerId = req.user.dealerId;
    }

    const order = await prisma.order.findFirst({
      where,
      include: {
        dealer: true,
        quote: {
          include: {
            customer: true,
            items: { orderBy: { lineNumber: 'asc' } },
          },
        },
        recipes: {
          orderBy: { lineNumber: 'asc' },
          include: {
            parts: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Sipariş bulunamadı',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Sipariş alınamadı',
    });
  }
};

// Sipariş durumu güncelle
export const updateOrderStatus = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Sipariş bulunamadı',
      });
    }

    // Durum geçiş kontrolü
    const validTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'],
      IN_PRODUCTION: ['READY', 'CANCELLED'],
      READY: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `${order.status} durumundan ${status} durumuna geçiş yapılamaz`,
      });
    }

    const updateData: any = { status };

    // Durum tarihlerini güncelle
    switch (status) {
      case 'CONFIRMED':
        updateData.confirmedAt = new Date();
        break;
      case 'SHIPPED':
        updateData.shippedAt = new Date();
        break;
      case 'DELIVERED':
        updateData.deliveredAt = new Date();
        break;
    }

    if (notes) {
      updateData.notes = order.notes ? `${order.notes}\n${notes}` : notes;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        dealer: { select: { id: true, code: true, companyName: true } },
        quote: { select: { id: true, quoteNumber: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'Order',
        entityId: id,
        oldValues: { status: order.status },
        newValues: { status },
      },
    });

    res.json({
      success: true,
      message: `Sipariş durumu "${status}" olarak güncellendi`,
      data: updated,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Sipariş durumu güncellenemedi',
    });
  }
};

// Üretim reçetelerini getir
export const getProductionRecipes = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        dealer: { select: { id: true, code: true, companyName: true } },
        quote: {
          select: {
            quoteNumber: true,
            customer: { select: { companyName: true } },
          },
        },
        recipes: {
          orderBy: { lineNumber: 'asc' },
          include: {
            parts: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Sipariş bulunamadı',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get production recipes error:', error);
    res.status(500).json({
      success: false,
      error: 'Üretim reçeteleri alınamadı',
    });
  }
};

// Üretim reçetesi durumu güncelle
export const updateRecipeStatus = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id, recipeId } = req.params;
    const { status, notes } = req.body;

    const recipe = await prisma.productionRecipe.findFirst({
      where: { id: recipeId, orderId: id },
    });

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Üretim reçetesi bulunamadı',
      });
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz durum',
      });
    }

    const updateData: any = { status };
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }
    if (notes) {
      updateData.notes = notes;
    }

    const updated = await prisma.productionRecipe.update({
      where: { id: recipeId },
      data: updateData,
    });

    // Tüm reçeteler tamamlandıysa siparişi güncelle
    const allRecipes = await prisma.productionRecipe.findMany({
      where: { orderId: id },
    });

    const allCompleted = allRecipes.every((r) => r.status === 'COMPLETED');
    if (allCompleted) {
      await prisma.order.update({
        where: { id },
        data: { status: 'READY' },
      });
    }

    res.json({
      success: true,
      message: 'Reçete durumu güncellendi',
      data: updated,
    });
  } catch (error) {
    console.error('Update recipe status error:', error);
    res.status(500).json({
      success: false,
      error: 'Reçete durumu güncellenemedi',
    });
  }
};

// Sipariş istatistikleri (Admin dashboard)
export const getOrderStats = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const where: any = {};
    if (req.user?.role === 'DEALER' && req.user.dealerId) {
      where.dealerId = req.user.dealerId;
    }

    const [
      totalOrders,
      pendingOrders,
      inProductionOrders,
      completedOrders,
      totalRevenue,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: 'PENDING' } }),
      prisma.order.count({ where: { ...where, status: 'IN_PRODUCTION' } }),
      prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.order.aggregate({
        where: { ...where, status: 'DELIVERED' },
        _sum: { totalAmount: true },
      }),
    ]);

    // Son 30 gün sipariş sayısı
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = await prisma.order.count({
      where: {
        ...where,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        inProductionOrders,
        completedOrders,
        recentOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      error: 'İstatistikler alınamadı',
    });
  }
};

// Sipariş notları güncelle
export const updateOrderNotes = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const { notes, shippingAddress, trackingNumber } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Sipariş bulunamadı',
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        notes,
        shippingAddress,
        trackingNumber,
      },
    });

    res.json({
      success: true,
      message: 'Sipariş bilgileri güncellendi',
      data: updated,
    });
  } catch (error) {
    console.error('Update order notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Sipariş bilgileri güncellenemedi',
    });
  }
};
