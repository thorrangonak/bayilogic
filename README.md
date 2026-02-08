# BAYEDİ ERP System

Alüminyum perde ve tavan sistemleri için kapsamlı ERP çözümü.

## Özellikler

- 🔐 JWT tabanlı kimlik doğrulama (Admin ve Bayi rolleri)
- 📊 Otomatik fiyat hesaplama (Excel formüllerine dayalı)
- 📄 Teklif yönetimi ve PDF oluşturma
- 📦 Sipariş takibi ve üretim reçeteleri
- 👥 Müşteri ve bayi yönetimi
- 📊 Dashboard ve raporlama

## Teknolojiler

### Backend
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- JWT Authentication
- PDFKit for PDF generation

### Frontend
- React 18 + TypeScript + Vite
- TailwindCSS
- Zustand (State Management)
- TanStack React Query

## Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL 14+
- npm veya yarn

### Backend Kurulumu

```bash
cd backend
npm install

# .env dosyasını oluşturun
cp .env.example .env

# Veritabanını ayarlayın
npx prisma migrate dev
npx prisma db seed

# Geliştirme sunucusunu başlatın
npm run dev
```

### Frontend Kurulumu

```bash
cd frontend
npm install
npm run dev
```

## Test Hesapları

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Admin | admin@bayedi.com | admin2024 |
| Bayi | bayi@bayedi.com | bayi2024 |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Giriş
- `POST /api/auth/logout` - Çıkış
- `GET /api/auth/me` - Kullanıcı bilgisi

### Quotes (Teklifler)
- `GET /api/quotes` - Teklif listesi
- `POST /api/quotes` - Yeni teklif
- `GET /api/quotes/:id` - Teklif detayı
- `POST /api/quotes/:id/items` - Kalem ekle
- `POST /api/quotes/:id/send` - Teklif gönder
- `POST /api/quotes/:id/convert` - Siparişe dönüştür

### Orders (Siparişler)
- `GET /api/orders` - Sipariş listesi
- `PUT /api/orders/:id/status` - Durum güncelle

### Customers (Müşteriler)
- `GET /api/customers` - Müşteri listesi
- `POST /api/customers` - Yeni müşteri

### Dealers (Bayiler) - Admin Only
- `GET /api/dealers` - Bayi listesi
- `POST /api/dealers` - Yeni bayi

### Products (Ürünler) - Admin Only
- `GET /api/products` - Ürün listesi
- `PUT /api/products/bulk-prices` - Toplu fiyat güncelleme

## Lisans

MIT License
