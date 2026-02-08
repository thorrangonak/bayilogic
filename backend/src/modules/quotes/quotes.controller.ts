import { Response } from 'express';
import { PrismaClient, QuoteStatus, SystemType } from '@prisma/client';
import { AuthRequest, ApiResponse, QuoteItemInput } from '../../types';
import { calculateQuoteItem, generateQuoteNumber, generateOrderNumber } from '../../utils/calculation';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();

// Teklifleri listele
export const getQuotes = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { page = 1, limit = 20, status, customerId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { deletedAt: null };

    // Bayi sadece kendi tekliflerini görür
    if (req.user?.role === 'DEALER' && req.user.dealerId) {
      where.dealerId = req.user.dealerId;
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          customer: true,
          dealer: { select: { id: true, code: true, companyName: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.quote.count({ where }),
    ]);

    res.json({
      success: true,
      data: quotes,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({
      success: false,
      error: 'Teklifler alınamadı',
    });
  }
};

// Teklif detayı
export const getQuoteById = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(req.user?.role === 'DEALER' && req.user.dealerId
          ? { dealerId: req.user.dealerId }
          : {}),
      },
      include: {
        customer: true,
        dealer: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: { orderBy: { lineNumber: 'asc' } },
        order: true,
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Teklif bulunamadı',
      });
    }

    res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({
      success: false,
      error: 'Teklif alınamadı',
    });
  }
};

// Yeni teklif oluştur
export const createQuote = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { customerId, notes, validUntil } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Müşteri seçimi gerekli',
      });
    }

    // Müşteriyi kontrol et
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
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

    const quoteNumber = await generateQuoteNumber();

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        dealerId: customer.dealerId,
        customerId,
        createdById: req.user!.userId,
        status: QuoteStatus.DRAFT,
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün
        notes,
      },
      include: {
        customer: true,
        dealer: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Quote',
        entityId: quote.id,
        newValues: { quoteNumber: quote.quoteNumber },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Teklif oluşturuldu',
      data: quote,
    });
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({
      success: false,
      error: 'Teklif oluşturulamadı',
    });
  }
};

// Teklif güncelle
export const updateQuote = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const { notes, internalNotes, validUntil, discountRate } = req.body;

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
        status: QuoteStatus.DRAFT, // Sadece taslak güncellenebilir
        ...(req.user?.role === 'DEALER' && req.user.dealerId
          ? { dealerId: req.user.dealerId }
          : {}),
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Teklif bulunamadı veya güncellenemez durumda',
      });
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        notes,
        internalNotes,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        discountRate: discountRate !== undefined ? discountRate : undefined,
      },
      include: {
        customer: true,
        items: true,
      },
    });

    res.json({
      success: true,
      message: 'Teklif güncellendi',
      data: updated,
    });
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({
      success: false,
      error: 'Teklif güncellenemedi',
    });
  }
};

// Teklif kalemi ekle
export const addQuoteItem = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const itemInput: QuoteItemInput = req.body;

    // Teklifi kontrol et
    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
        status: QuoteStatus.DRAFT,
        ...(req.user?.role === 'DEALER' && req.user.dealerId
          ? { dealerId: req.user.dealerId }
          : {}),
      },
      include: {
        dealer: true,
        items: true,
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Teklif bulunamadı veya kalem eklenemez',
      });
    }

    // Hesapla
    const calculation = await calculateQuoteItem(
      itemInput,
      Number(quote.dealer?.profitMargin || 0),
      Number(quote.dealer?.discountRate || 0)
    );

    // Satır numarası
    const lineNumber = quote.items.length + 1;

    // Kalemi ekle
    const item = await prisma.quoteItem.create({
      data: {
        quoteId: id,
        systemType: itemInput.systemType as SystemType,
        lineNumber,
        width: itemInput.width,
        height: itemInput.height,
        quantity: itemInput.quantity,
        paintCode: itemInput.paintCode,
        unitPrice: calculation.grandTotal / itemInput.quantity,
        totalPrice: calculation.grandTotal,
        totalKg: calculation.totalProfileKg,
        details: {
          profiles: calculation.profiles,
          accessories: calculation.accessories,
        },
        includeFabric: itemInput.includeFabric || false,
        fabricPrice: itemInput.fabricPrice,
        fabricTotal: calculation.fabricCost,
        includeMotor: itemInput.includeMotor || false,
        motorType: itemInput.motorType,
        motorPrice: itemInput.motorPrice,
        motorQty: itemInput.motorQty,
        remoteType: itemInput.remoteType,
        remotePrice: itemInput.remotePrice,
        remoteQty: itemInput.remoteQty,
        motorTotal: calculation.motorCost,
      },
    });

    // Teklif toplamlarını güncelle
    await updateQuoteTotals(id);

    const updatedQuote = await prisma.quote.findUnique({
      where: { id },
      include: { items: { orderBy: { lineNumber: 'asc' } } },
    });

    res.status(201).json({
      success: true,
      message: 'Kalem eklendi',
      data: updatedQuote,
    });
  } catch (error) {
    console.error('Add quote item error:', error);
    res.status(500).json({
      success: false,
      error: 'Kalem eklenemedi',
    });
  }
};

// Teklif kalemi güncelle
export const updateQuoteItem = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id, itemId } = req.params;
    const itemInput: QuoteItemInput = req.body;

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
        status: QuoteStatus.DRAFT,
        ...(req.user?.role === 'DEALER' && req.user.dealerId
          ? { dealerId: req.user.dealerId }
          : {}),
      },
      include: { dealer: true },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Teklif bulunamadı',
      });
    }

    // Hesapla
    const calculation = await calculateQuoteItem(
      itemInput,
      Number(quote.dealer?.profitMargin || 0),
      Number(quote.dealer?.discountRate || 0)
    );

    await prisma.quoteItem.update({
      where: { id: itemId },
      data: {
        systemType: itemInput.systemType as SystemType,
        width: itemInput.width,
        height: itemInput.height,
        quantity: itemInput.quantity,
        paintCode: itemInput.paintCode,
        unitPrice: calculation.grandTotal / itemInput.quantity,
        totalPrice: calculation.grandTotal,
        totalKg: calculation.totalProfileKg,
        details: {
          profiles: calculation.profiles,
          accessories: calculation.accessories,
        },
        includeFabric: itemInput.includeFabric || false,
        fabricPrice: itemInput.fabricPrice,
        fabricTotal: calculation.fabricCost,
        includeMotor: itemInput.includeMotor || false,
        motorType: itemInput.motorType,
        motorPrice: itemInput.motorPrice,
        motorQty: itemInput.motorQty,
        remoteType: itemInput.remoteType,
        remotePrice: itemInput.remotePrice,
        remoteQty: itemInput.remoteQty,
        motorTotal: calculation.motorCost,
      },
    });

    await updateQuoteTotals(id);

    const updatedQuote = await prisma.quote.findUnique({
      where: { id },
      include: { items: { orderBy: { lineNumber: 'asc' } } },
    });

    res.json({
      success: true,
      message: 'Kalem güncellendi',
      data: updatedQuote,
    });
  } catch (error) {
    console.error('Update quote item error:', error);
    res.status(500).json({
      success: false,
      error: 'Kalem güncellenemedi',
    });
  }
};

// Teklif kalemi sil
export const deleteQuoteItem = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id, itemId } = req.params;

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
        status: QuoteStatus.DRAFT,
        ...(req.user?.role === 'DEALER' && req.user.dealerId
          ? { dealerId: req.user.dealerId }
          : {}),
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Teklif bulunamadı',
      });
    }

    await prisma.quoteItem.delete({
      where: { id: itemId },
    });

    // Satır numaralarını yeniden düzenle
    const remainingItems = await prisma.quoteItem.findMany({
      where: { quoteId: id },
      orderBy: { lineNumber: 'asc' },
    });

    for (let i = 0; i < remainingItems.length; i++) {
      await prisma.quoteItem.update({
        where: { id: remainingItems[i].id },
        data: { lineNumber: i + 1 },
      });
    }

    await updateQuoteTotals(id);

    res.json({
      success: true,
      message: 'Kalem silindi',
    });
  } catch (error) {
    console.error('Delete quote item error:', error);
    res.status(500).json({
      success: false,
      error: 'Kalem silinemedi',
    });
  }
};

// Teklifi gönder
export const sendQuote = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
        status: QuoteStatus.DRAFT,
        ...(req.user?.role === 'DEALER' && req.user.dealerId
          ? { dealerId: req.user.dealerId }
          : {}),
      },
      include: { items: true },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Teklif bulunamadı',
      });
    }

    if (quote.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Teklif boş olamaz, en az bir kalem ekleyin',
      });
    }

    await prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.SENT,
        sentAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'Quote',
        entityId: id,
        newValues: { status: 'SENT' },
      },
    });

    res.json({
      success: true,
      message: 'Teklif gönderildi',
    });
  } catch (error) {
    console.error('Send quote error:', error);
    res.status(500).json({
      success: false,
      error: 'Teklif gönderilemedi',
    });
  }
};

// Teklifi onayla
export const approveQuote = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    // Sadece admin onaylayabilir
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Bu işlem için admin yetkisi gerekli',
      });
    }

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
        status: QuoteStatus.SENT,
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Onaylanacak teklif bulunamadı',
      });
    }

    await prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'UPDATE',
        entityType: 'Quote',
        entityId: id,
        newValues: { status: 'APPROVED' },
      },
    });

    res.json({
      success: true,
      message: 'Teklif onaylanıdı',
    });
  } catch (error) {
    console.error('Approve quote error:', error);
    res.status(500).json({
      success: false,
      error: 'Teklif onaylanamadı',
    });
  }
};

// Teklifi reddet
export const rejectQuote = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
        status: { in: [QuoteStatus.SENT, QuoteStatus.APPROVED] },
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Reddedilecek teklif bulunamadı',
      });
    }

    await prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.REJECTED,
        rejectedAt: new Date(),
        internalNotes: reason
          ? `${quote.internalNotes || ''}\nRed sebebi: ${reason}`.trim()
          : quote.internalNotes,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'Quote',
        entityId: id,
        newValues: { status: 'REJECTED', reason },
      },
    });

    res.json({
      success: true,
      message: 'Teklif reddedildi',
    });
  } catch (error) {
    console.error('Reject quote error:', error);
    res.status(500).json({
      success: false,
      error: 'Teklif reddedilemedi',
    });
  }
};

// Siparişe dönüştür
export const convertToOrder = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
        status: QuoteStatus.APPROVED,
      },
      include: { items: true },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Siparişe dönüştürülecek onaylı teklif bulunamadı',
      });
    }

    const orderNumber = await generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        quoteId: id,
        dealerId: quote.dealerId,
        totalAmount: quote.totalAmount,
        currency: quote.currency,
        status: 'PENDING',
      },
    });

    await prisma.quote.update({
      where: { id },
      data: { status: QuoteStatus.CONVERTED },
    });

    // Her teklif kalemi için üretim reçetesi oluştur
    for (const item of quote.items) {
      await prisma.productionRecipe.create({
        data: {
          orderId: order.id,
          systemType: item.systemType,
          lineNumber: item.lineNumber,
          width: item.width,
          height: item.height,
          quantity: item.quantity,
          paintCode: item.paintCode,
          status: 'PENDING',
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Order',
        entityId: order.id,
        newValues: { orderNumber, fromQuote: quote.quoteNumber },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Sipariş oluşturuldu',
      data: order,
    });
  } catch (error) {
    console.error('Convert to order error:', error);
    res.status(500).json({
      success: false,
      error: 'Sipariş oluşturulamadı',
    });
  }
};

// PDF oluştur
export const generatePdf = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(req.user?.role === 'DEALER' && req.user.dealerId
          ? { dealerId: req.user.dealerId }
          : {}),
      },
      include: {
        customer: true,
        dealer: true,
        items: { orderBy: { lineNumber: 'asc' } },
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Teklif bulunamadı',
      });
    }

    // PDF oluştur
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Teklif-${quote.quoteNumber}.pdf`
    );

    doc.pipe(res);

    // Başlık
    doc.fontSize(20).text('FİYAT TEKLİFİ', { align: 'center' });
    doc.moveDown();

    // Teklif bilgileri
    doc.fontSize(12);
    doc.text(`Teklif No: ${quote.quoteNumber}`);
    doc.text(`Tarih: ${quote.createdAt.toLocaleDateString('tr-TR')}`);
    doc.text(`Geçerlilik: ${quote.validUntil?.toLocaleDateString('tr-TR') || '-'}`);
    doc.moveDown();

    // Bayi bilgileri
    doc.text('BAYİ BİLGİLERİ', { underline: true });
    doc.text(`Firma: ${quote.dealer?.companyName || '-'}`);
    doc.text(`Tel: ${quote.dealer?.phone || '-'}`);
    doc.moveDown();

    // Müşteri bilgileri
    doc.text('MÜŞTERİ BİLGİLERİ', { underline: true });
    doc.text(`Firma: ${quote.customer.companyName}`);
    doc.text(`Yetkili: ${quote.customer.contactName || '-'}`);
    doc.text(`Tel: ${quote.customer.phone || '-'}`);
    doc.moveDown();

    // Kalemler
    doc.text('TEKLİF KALEMLERİ', { underline: true });
    doc.moveDown(0.5);

    for (const item of quote.items) {
      doc.text(`${item.lineNumber}. ${item.systemType}`);
      doc.text(`   Ölçü: ${item.width} x ${item.height} mm - Adet: ${item.quantity}`);
      doc.text(`   Birim Fiyat: ${Number(item.unitPrice).toFixed(2)} € - Toplam: ${Number(item.totalPrice).toFixed(2)} €`);

      if (item.includeFabric) {
        doc.text(`   Kumaş: ${Number(item.fabricTotal).toFixed(2)} €`);
      }
      if (item.includeMotor) {
        doc.text(`   Motor: ${item.motorType} - ${Number(item.motorTotal).toFixed(2)} €`);
      }
      doc.moveDown(0.5);
    }

    // Toplam
    doc.moveDown();
    doc.fontSize(14).text(`TOPLAM: ${Number(quote.totalAmount).toFixed(2)} €`, { align: 'right' });

    // Notlar
    if (quote.notes) {
      doc.moveDown();
      doc.fontSize(10).text('NOTLAR:', { underline: true });
      doc.text(quote.notes);
    }

    doc.end();
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'PDF oluşturulamadı',
    });
  }
};

// Fiyat hesapla (preview)
export const calculatePrice = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const itemInput: QuoteItemInput = req.body;

    if (!itemInput.systemType || !itemInput.width || !itemInput.height || !itemInput.quantity) {
      return res.status(400).json({
        success: false,
        error: 'Sistem tipi, genişlik, yükseklik ve adet gerekli',
      });
    }

    // Bayi marjlarını al
    let profitMargin = 0;
    let discountRate = 0;

    if (req.user?.dealerId) {
      const dealer = await prisma.dealer.findUnique({
        where: { id: req.user.dealerId },
      });
      if (dealer) {
        profitMargin = Number(dealer.profitMargin);
        discountRate = Number(dealer.discountRate);
      }
    }

    const calculation = await calculateQuoteItem(itemInput, profitMargin, discountRate);

    res.json({
      success: true,
      data: calculation,
    });
  } catch (error) {
    console.error('Calculate price error:', error);
    res.status(500).json({
      success: false,
      error: 'Fiyat hesaplanamadı',
    });
  }
};

// Yardımcı: Teklif toplamlarını güncelle
async function updateQuoteTotals(quoteId: string) {
  const items = await prisma.quoteItem.findMany({
    where: { quoteId },
  });

  const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
  });

  const discountAmount = subtotal * (Number(quote?.discountRate || 0) / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (Number(quote?.taxRate || 20) / 100);
  const totalAmount = afterDiscount + taxAmount;

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
    },
  });
}
