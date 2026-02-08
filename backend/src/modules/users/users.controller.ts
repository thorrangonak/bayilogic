import { Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthRequest, ApiResponse } from '../../types';

const prisma = new PrismaClient();

// Kullanıcıları listele
export const getUsers = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { page = 1, limit = 20, search, role, dealerId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { isActive: true };

    // Bayi sadece kendi kullanıcılarını görür
    if (req.user?.role === 'DEALER' && req.user.dealerId) {
      where.dealerId = req.user.dealerId;
    } else if (dealerId) {
      where.dealerId = dealerId;
    }

    if (search) {
      where.OR = [
        { email: { contains: String(search), mode: 'insensitive' } },
        { name: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role as UserRole;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          dealer: { select: { id: true, code: true, companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Kullanıcılar alınamadı',
    });
  }
};

// Kullanıcı detayı
export const getUserById = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const where: any = { id, isActive: true };

    // Bayi sadece kendi kullanıcılarını görebilir
    if (req.user?.role === 'DEALER' && req.user.dealerId) {
      where.dealerId = req.user.dealerId;
    }

    const user = await prisma.user.findFirst({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        dealer: { select: { id: true, code: true, companyName: true } },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Kullanıcı alınamadı',
    });
  }
};

// Yeni kullanıcı oluştur
export const createUser = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { email, password, name, phone, role, dealerId } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, şifre ve isim gerekli',
      });
    }

    // Email kontrolü
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Bu email adresi zaten kullanımda',
      });
    }

    // Bayi ID belirleme
    let userDealerId: string | null = null;
    if (req.user?.role === 'ADMIN') {
      userDealerId = dealerId || null;
    } else if (req.user?.dealerId) {
      userDealerId = req.user.dealerId;
    }

    // Rol belirleme
    let userRole: UserRole = 'DEALER';
    if (req.user?.role === 'ADMIN' && role) {
      userRole = role;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: userRole,
        dealerId: userDealerId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        dealer: { select: { id: true, code: true, companyName: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'User',
        entityId: user.id,
        newValues: { email: user.email, role: user.role },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Kullanıcı oluşturuldu',
      data: user,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Kullanıcı oluşturulamadı',
    });
  }
};

// Kullanıcı güncelle
export const updateUser = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const { name, phone, role, isActive, dealerId } = req.body;

    const where: any = { id };
    if (req.user?.role === 'DEALER' && req.user.dealerId) {
      where.dealerId = req.user.dealerId;
    }

    const user = await prisma.user.findFirst({ where });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı',
      });
    }

    const updateData: any = { name, phone };

    // Admin rol ve bayi değiştirebilir
    if (req.user?.role === 'ADMIN') {
      if (role) updateData.role = role;
      if (dealerId !== undefined) updateData.dealerId = dealerId;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        dealer: { select: { id: true, code: true, companyName: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'User',
        entityId: id,
        oldValues: { name: user.name, role: user.role },
        newValues: { name: updated.name, role: updated.role },
      },
    });

    res.json({
      success: true,
      message: 'Kullanıcı güncellendi',
      data: updated,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Kullanıcı güncellenemedi',
    });
  }
};

// Şifre değiştir (Admin only veya kendi şifresi)
export const changePassword = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const { newPassword, currentPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Yeni şifre en az 6 karakter olmalı',
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı',
      });
    }

    // Kendi şifresini değiştiriyorsa mevcut şifreyi kontrol et
    if (req.user?.userId === id && currentPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Mevcut şifre hatalı',
        });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'User',
        entityId: id,
        newValues: { passwordChanged: true },
      },
    });

    res.json({
      success: true,
      message: 'Şifre değiştirildi',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Şifre değiştirilemedi',
    });
  }
};

// Kullanıcı sil (soft delete - deaktif et)
export const deleteUser = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    // Kendini silemez
    if (req.user?.userId === id) {
      return res.status(400).json({
        success: false,
        error: 'Kendinizi silemezsiniz',
      });
    }

    const where: any = { id, isActive: true };
    if (req.user?.role === 'DEALER' && req.user.dealerId) {
      where.dealerId = req.user.dealerId;
    }

    const user = await prisma.user.findFirst({ where });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı',
      });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE',
        entityType: 'User',
        entityId: id,
        oldValues: { email: user.email },
      },
    });

    res.json({
      success: true,
      message: 'Kullanıcı silindi',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Kullanıcı silinemedi',
    });
  }
};

// Profil bilgilerini getir
export const getProfile = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        dealer: {
          select: {
            id: true,
            code: true,
            companyName: true,
            profitMargin: true,
            discountRate: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Profil alınamadı',
    });
  }
};

// Profil güncelle
export const updateProfile = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { name, phone } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { name, phone },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    res.json({
      success: true,
      message: 'Profil güncellendi',
      data: updated,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Profil güncellenemedi',
    });
  }
};
