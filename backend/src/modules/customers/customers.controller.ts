import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, ApiResponse } from '../../types';

const prisma = new PrismaClient();

// Müşterileri listele
export const getCustomers = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { deletedAt: null };

    // Bayi sadece kendi müşterilerini görür
    if (req.user?.role === 'DEALER' && req.user.dealerId) {
      where.dealerId = req.user.dealerId;
    }

    // Arama
    if (search) {
      where.OR = [
        { companyName: { contains: String(search), mode: 'insensitive' } },
        { contactName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search) } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          dealer: { select: { id: true, code: true, companyName: true } },
          _count: { select: { quotes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: customers,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteriler alınamadı',
    });
  }
};

// Müşteri detayı
export const getCustomerById = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(req.user?.role === 'DEALER' && req.user.dealerId
          ? { dealerId: req.user.dealerId }
          : {}),
      },
      include: {
        dealer: { select: { id: true, code: true, companyName: true } },
        quotes: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Müşteri bulunamadı',
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteri alınamadı',
    });
  }
};

// Yeni müşteri oluştur
export const createCustomer = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      city,
      taxNumber,
      taxOffice,
      notes,
    } = req.body;

    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'Firma adı gerekli',
      });
    }

    // Bayi ID belirleme
    let dealerId: string;
    if (req.user?.role === 'ADMIN' && req.body.dealerId) {
      dealerId = req.body.dealerId;
    } else if (req.user?.dealerId) {
      dealerId = req.user.dealerId;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Bayi bilgisi gerekli',
      });
    }

    // Email kontrolü (opsiyonel ama benzersiz olmalı)
    if (email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { email, deletedAt: null },
      });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          error: 'Bu email adresi zaten kullanımda',
        });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        dealerId,
        companyName,
        contactName,
        email,
        phone,
        address,
        city,
        taxNumber,
        taxOffice,
        notes,
      },
      include: {
        dealer: { select: { id: true, code: true, companyName: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Customer',
        entityId: customer.id,
        newValues: { companyName: customer.companyName },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Müşteri oluşturuldu',
      data: customer,
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteri oluşturulamadı',
    });
  }
};

// Müşteri güncelle
export const updateCustomer = async (req: AuthRequest, res: Response<ApiResponse>) => {
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
      notes,
    } = req.body;

    // Müşteriyi kontrol et
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(req.user?.role === 'DEALER' && req.user.dealerId
          ? { dealerId: req.user.dealerId }
          : {}),
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Müşteri bulunamadı',
      });
    }

    // Email benzersizlik kontrolü
    if (email && email !== customer.email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { email, deletedAt: null, id: { not: id } },
      });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          error: 'Bu email adresi zaten kullanımda',
        });
      }
    }

    const updated = await prisma.customer.update({
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
        notes,
      },
      include: {
        dealer: { select: { id: true, code: true, companyName: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'Customer',
        entityId: id,
        oldValues: { companyName: customer.companyName },
        newValues: { companyName: updated.companyName },
      },
    });

    res.json({
      success: true,
      message: 'Müşteri güncellendi',
      data: updated,
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteri güncellenemedi',
    });
  }
};

// Müşteri sil (soft delete)
export const deleteCustomer = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(req.user?.role === 'DEALER' && req.user.dealerId
          ? { dealerId: req.user.dealerId }
          : {}),
      },
      include: {
        _count: { select: { quotes: { where: { deletedAt: null } } } },
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Müşteri bulunamadı',
      });
    }

    // Aktif teklifi varsa silme
    if (customer._count.quotes > 0) {
      return res.status(400).json({
        success: false,
        error: `Bu müşteriye ait ${customer._count.quotes} adet teklif var. Önce teklifleri silin.`,
      });
    }

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE',
        entityType: 'Customer',
        entityId: id,
        oldValues: { companyName: customer.companyName },
      },
    });

    res.json({
      success: true,
      message: 'Müşteri silindi',
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteri silinemedi',
    });
  }
};

// Müşteri istatistikleri
export const getCustomerStats = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(req.user?.role === 'DEALER' && req.user.dealerId
          ? { dealerId: req.user.dealerId }
          : {}),
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Müşteri bulunamadı',
      });
    }

    const [totalQuotes, approvedQuotes, totalRevenue] = await Promise.all([
      prisma.quote.count({
        where: { customerId: id, deletedAt: null },
      }),
      prisma.quote.count({
        where: { customerId: id, deletedAt: null, status: { in: ['APPROVED', 'CONVERTED'] } },
      }),
      prisma.quote.aggregate({
        where: { customerId: id, deletedAt: null, status: { in: ['APPROVED', 'CONVERTED'] } },
        _sum: { totalAmount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalQuotes,
        approvedQuotes,
        conversionRate: totalQuotes > 0 ? ((approvedQuotes / totalQuotes) * 100).toFixed(1) : 0,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      error: 'İstatistikler alınamadı',
    });
  }
};
