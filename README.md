# BAYEDİ ERP System

Modern bayi yönetim ve teklif hesaplama sistemi. Zip perde sistemleri için özel olarak tasarlanmış, çok bayili ERP çözümü.

## Özellikler

### Bayi Yönetimi
- Çoklu bayi desteği
- Bayi bazlı kâr marjı ve indirim oranları
- Bayi kullanıcıları yönetimi

### Müşteri Yönetimi
- Bayi bazlı müşteri kayıtları
- Vergi bilgileri ve iletişim detayları

### Teklif Sistemi
- Otomatik fiyat hesaplama
- BYD100, BYD125, SKY1500, SKY1600 sistemleri
- Profil, aparat, motor ve kumaş hesaplamaları
- PDF teklif oluşturma
- Teklif durumu takibi (Taslak → Gönderildi → Onaylandı → Siparişe Dönüştü)

### Sipariş Yönetimi
- Sipariş durumu takibi
- Üretim reçetesi oluşturma
- Durum geçiş workflow'u (PENDING → CONFIRMED → IN_PRODUCTION → READY → SHIPPED → DELIVERED)

### Ürün Kataloğu
- Profil, aparat, motor, kumanda kategorileri
- Sistem bazlı ürünler
- Toplu fiyat güncelleme

## Teknoloji Stack

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** JWT
- **PDF:** PDFKit

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **State:** Zustand
- **Data Fetching:** TanStack React Query
- **Routing:** React Router v6

## Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL 14+
- npm veya yarn

### Backend Kurulum

```bash
cd backend
npm install

# .env dosyasını oluşturun
cp .env.example .env

# Database migration
npx prisma migrate dev

# Seed data
npx prisma db seed

# Development server
npm run dev
```

### Frontend Kurulum

```bash
cd frontend
npm install
npm run dev
```

## Environment Değişkenleri

### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/bayedi"
JWT_SECRET="your-secret-key"
PORT=3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Giriş
- `GET /api/auth/me` - Kullanıcı bilgisi

### Customers
- `GET /api/customers` - Liste
- `POST /api/customers` - Oluştur
- `GET /api/customers/:id` - Detay
- `PUT /api/customers/:id` - Güncelle
- `DELETE /api/customers/:id` - Sil

### Quotes
- `GET /api/quotes` - Liste
- `POST /api/quotes` - Oluştur
- `GET /api/quotes/:id` - Detay
- `POST /api/quotes/:id/items` - Kalem ekle
- `POST /api/quotes/:id/send` - Gönder
- `POST /api/quotes/:id/convert-to-order` - Siparişe dönüştür
- `POST /api/quotes/calculate` - Fiyat hesapla

### Orders
- `GET /api/orders` - Liste
- `GET /api/orders/:id` - Detay
- `PUT /api/orders/:id/status` - Durum güncelle
- `GET /api/orders/stats` - İstatistikler

### Products (Admin)
- `GET /api/products` - Liste
- `POST /api/products` - Oluştur
- `PUT /api/products/:id` - Güncelle
- `PUT /api/products/bulk-prices` - Toplu fiyat güncelleme

### Dealers (Admin)
- `GET /api/dealers` - Liste
- `POST /api/dealers` - Oluştur
- `PUT /api/dealers/:id` - Güncelle
- `DELETE /api/dealers/:id` - Sil

## Test Hesapları

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Admin | admin@bayedi.com | admin2024 |
| Bayi | bayi@bayedi.com | bayi2024 |

## Lisans

MIT
