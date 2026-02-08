import { Router } from 'express';
import * as quotesController from './quotes.controller';
import { authenticate, requireDealerOrAdmin } from '../../middleware/auth';

const router = Router();

// Tüm route'lar authentication gerektirir
router.use(authenticate);
router.use(requireDealerOrAdmin);

// GET /api/quotes - Teklifleri listele
router.get('/', quotesController.getQuotes);

// GET /api/quotes/:id - Teklif detayı
router.get('/:id', quotesController.getQuoteById);

// POST /api/quotes - Yeni teklif oluştur
router.post('/', quotesController.createQuote);

// PUT /api/quotes/:id - Teklif güncelle
router.put('/:id', quotesController.updateQuote);

// POST /api/quotes/:id/items - Teklif kalemi ekle
router.post('/:id/items', quotesController.addQuoteItem);

// PUT /api/quotes/:id/items/:itemId - Teklif kalemi güncelle
router.put('/:id/items/:itemId', quotesController.updateQuoteItem);

// DELETE /api/quotes/:id/items/:itemId - Teklif kalemi sil
router.delete('/:id/items/:itemId', quotesController.deleteQuoteItem);

// POST /api/quotes/:id/send - Teklifi gönder
router.post('/:id/send', quotesController.sendQuote);

// POST /api/quotes/:id/approve - Teklifi onayla (Admin)
router.post('/:id/approve', quotesController.approveQuote);

// POST /api/quotes/:id/reject - Teklifi reddet
router.post('/:id/reject', quotesController.rejectQuote);

// POST /api/quotes/:id/convert - Siparişe dönüştür
router.post('/:id/convert', quotesController.convertToOrder);

// GET /api/quotes/:id/pdf - PDF indir
router.get('/:id/pdf', quotesController.generatePdf);

// POST /api/quotes/calculate - Fiyat hesapla (preview)
router.post('/calculate', quotesController.calculatePrice);

export default router;
