import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, ApiResponse } from '../../types';

const prisma = new PrismaClient();

// Bayileri listele
export const getDealers = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { deletedAt: null };

    // Bayi sadece kendini görür
    if (req.user?.role === 'DEALER' && req.user.dealerId) {
      where.id = req.user.dealerId;
    }

    if (search) {
      where.OR = [
        { code: { contains: String(search), mode: 'insensitive' } },
        { companyName: { contains: String(search), mode: 'insensitive' } },
        { contactName: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [dealers, total] = await Promise.all([
      prisma.dealer.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              customers: { where: { deletedAt: null } },
              quotes: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.dealer.count({ where }),
    ]);

    res.json({
      success: true,
      data: dealers,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get dealers error:', error);
    res.status(500).json({
      success: false,
      error: 'Bayiler alınamadı',
    });
  }
};

// Bayi detayı
export const getDealerById = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    // Bayi sadece kendini görebilir
    if (req.user?.role === 'DEALER' && req.user.dealerId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Bu bayiye erişim yetkiniz yok',
      });
    }

    const dealer = await prisma.dealer.findFirst({
      where: { id, deletedAt: null },
      include: {
        users: {
          where: { isActive: true },
          select: { id: true, email: true, name: true, role: true },
        },
        _count: {
          select: {
            customers: { where: { deletedAt: null } },
            quotes: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        error: 'Bayi bulunamadı',
      });
    }

    res.json({
      success: true,
      data: dealer,
    });
  } catch (error) {
    console.error('Get dealer error:', error);
    res.status(500).json({
      success: false,
      error: 'Bayi alınamadı',
    });
  }
};

// Yeni bayi oluştur (Admin only)
export const createDealer = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const {
      code,
      companyName,
      contactName,
      email,
      phone,
      address,
      city,
      taxNumber,
      taxOffice,
      profitMargin,
      discountRate,
    } = req.body;

    if (!code || !companyName) {
      return res.status(400).json({
        success: false,
        error: 'Bayi kodu ve firma adı gerekli',
      });
    }

    // Kod benzersizlik kontrolü
    const existingDealer = await prisma.dealer.findFirst({
      where: {
        OR: [{ code }, ...(email ? [{ email }] : [])],
        deletedAt: null,
      },
    });

    if (existingDealer) {
      return res.status(400).json({
        success: false,
        error: 'Bu bayi kodu veya email zaten kullanımda',
      });
    }

    const dealer = await prisma.dealer.create({
      data: {
        code: code.toUpperCase(),
        companyName,
        contactName,
        email,
        phone,
        address,
        city,
        taxNumber,
        taxOffice,
        profitMargin: profitMargin || 25,
        discountRate: discountRate || 0,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Dealer',
        entityId: dealer.id,
        newValues: { code: dealer.code, companyName: dealer.companyName },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Bayi oluşturuldu',
      data: dealer,
    });
  } catch (error) {
    console.error('Create dealer error:', error);
    res.status(500).json({
      success: false,
      error: 'Bayi oluşturulamadı',
    });
  }
};

// Bayi güncelle (Admin only)
export const updateDealer = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      city,
      taxNumber,
      taxOffice,
      profitMargin,
      discountRate,
      isActive,
    } = req.body;

    const dealer = await prisma.dealer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        error: 'Bayi bulunamadı',
      });
    }

    // Email benzersizlik kontrolü
    if (email && email !== dealer.email) {
      const existingDealer = await prisma.dealer.findFirst({
        where: { email, deletedAt: null, id: { not: id } },
      });
      if (existingDealer) {
        return res.status(400).json({
          success: false,
          error: 'Bu email adresi zaten kullanımda',
        });
      }
    }

    const updated = await prisma.dealer.update({
      where: { id },
      data: {
        companyName,
        contactName,
        email,
        phone,
        address,
        city,
        taxNumber,
        taxOffice,
        profitMargin,
        discountRate,
        isActive,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'Dealer',
        entityId: id,
        oldValues: { profitMargin: dealer.profitMargin, discountRate: dealer.discountRate },
        newValues: { profitMargin: updated.profitMargin, discountRate: updated.discountRate },
      },
    });

    res.json({
      success: true,
      message: 'Bayi güncellendi',
      data: updated,
    });
  } catch (error) {
    console.error('Update dealer error:', error);
    res.status(500).json({
      success: false,
      error: 'Bayi güncellenemedi',
    });
  }
};

// Bayi sil (Admin only, soft delete)
export const deleteDealer = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const dealer = await prisma.dealer.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            users: { where: { isActive: true } },
            quotes: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        error: 'Bayi bulunamadı',
      });
    }

    // Aktif kullanıcı veya teklifi varsa silme
    if (dealer._count.users > 0 || dealer._count.quotes > 0) {
      return res.status(400).json({
        success: false,
        error: 'Bu bayiye ait aktif kullanıcı veya teklif var. Önce bunları silin.',
      });
    }

    await prisma.dealer.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE',
        entityType: 'Dealer',
        entityId: id,
        oldValues: { code: dealer.code, companyName: dealer.companyName },
      },
    });

    res.json({
      success: true,
      message: 'Bayi silindi',
    });
  } catch (error) {
    console.error('Delete dealer error:', error);
    res.status(500).json({
      success: false,
      error: 'Bayi silinemedi',
    });
  }
};

// Bayi kullanıcıları
export const getDealerUsers = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    // Bayi sadece kendi kullanıcılarını görebilir
    if (req.user?.role === 'DEALER' && req.user.dealerId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Bu bayinin kullanıcılarına erişim yetkiniz yok',
      });
    }

    const users = await prisma.user.findMany({
      where: { dealerId: id, isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Get dealer users error:', error);
    res.status(500).json({
      success: false,
      error: 'Bayi kullanıcıları alınamadı',
    });
  }
};

// Bayi istatistikleri
export const getDealerStats = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    // Bayi sadece kendi istatistiklerini görebilir
    if (req.user?.role === 'DEALER' && req.user.dealerId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Bu bayinin istatistiklerine erişim yetkiniz yok',
      });
    }

    const [
      totalCustomers,
      totalQuotes,
      approvedQuotes,
      totalRevenue,
      recentQuotes,
    ] = await Promise.all([
      prisma.customer.count({ where: { dealerId: id, deletedAt: null } }),
      prisma.quote.count({ where: { dealerId: id, deletedAt: null } }),
      prisma.quote.count({
        where: { dealerId: id, deletedAt: null, status: { in: ['APPROVED', 'CONVERTED'] } },
      }),
      prisma.quote.aggregate({
        where: { dealerId: id, deletedAt: null, status: { in: ['APPROVED', 'CONVERTED'] } },
        _sum: { totalAmount: true },
      }),
      prisma.quote.findMany({
        where: { dealerId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          customer: { select: { companyName: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalCustomers,
        totalQuotes,
        approvedQuotes,
        conversionRate: totalQuotes > 0 ? ((approvedQuotes / totalQuotes) * 100).toFixed(1) : 0,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        recentQuotes,
      },
    });
  } catch (error) {
    console.error('Get dealer stats error:', error);
    res.status(500).json({
      success: false,
      error: 'İstatistikler alınamadı',
    });
  }
};
