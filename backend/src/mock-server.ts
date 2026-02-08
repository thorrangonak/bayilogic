import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'bayedi-super-secret-jwt-key-2024';

// Mock Data
const users = [
  { id: '1', email: 'admin@bayedi.com', password: 'admin2024', firstName: 'Admin', lastName: 'User', role: 'ADMIN', dealerId: null },
  { id: '2', email: 'bayi@bayedi.com', password: 'bayi2024', firstName: 'Bayi', lastName: 'User', role: 'DEALER', dealerId: '1' },
];

const dealers = [
  { id: '1', code: 'BAY-001', companyName: 'Demo Bayi Ltd.', contactName: 'Ahmet Yılmaz', city: 'İstanbul', profitMargin: 15, discountRate: 5, isActive: true },
  { id: '2', code: 'BAY-002', companyName: 'Test Bayi A.Ş.', contactName: 'Mehmet Demir', city: 'Ankara', profitMargin: 12, discountRate: 3, isActive: true },
];

const customers = [
  { id: '1', dealerId: '1', companyName: 'ABC İnşaat A.Ş.', contactName: 'Ali Kaya', phone: '+90 532 111 2233', email: 'ali@abc.com', city: 'İstanbul' },
  { id: '2', dealerId: '1', companyName: 'XYZ Yapı Ltd.', contactName: 'Veli Koç', phone: '+90 533 444 5566', email: 'veli@xyz.com', city: 'İzmir' },
];

const quotes = [
  { id: '1', quoteNumber: 'TKL-2024-0001', dealerId: '1', customerId: '1', status: 'DRAFT', totalAmount: 2500, createdAt: new Date() },
  { id: '2', quoteNumber: 'TKL-2024-0002', dealerId: '1', customerId: '2', status: 'SENT', totalAmount: 3800, createdAt: new Date() },
];

const orders = [
  { id: '1', orderNumber: 'SIP-2024-0001', dealerId: '1', quoteId: '1', status: 'PENDING', totalAmount: 2500, createdAt: new Date() },
];

const products = [
  { id: '1', code: 'PRF-001', name: 'Dikey Kasa Profili', category: 'PROFIL', system: 'BYD100', unit: 'mt', unitPrice: 12.5, gramaj: 0.85 },
  { id: '2', code: 'PRF-002', name: 'Alt Profil', category: 'PROFIL', system: 'BYD100', unit: 'mt', unitPrice: 8.2, gramaj: 0.65 },
  { id: '3', code: 'APR-001', name: 'Köşe Bağlantı', category: 'APARAT', system: 'BYD100', unit: 'ad', unitPrice: 2.5 },
  { id: '4', code: 'MTR-001', name: 'Somfy Motor', category: 'MOTOR', system: 'ALL', unit: 'ad', unitPrice: 180 },
];

// Auth middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token gerekli' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = users.find(u => u.id === decoded.userId);
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
  }
};

// Routes

// Health check for Railway
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ success: false, error: 'Geçersiz e-posta veya şifre' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const dealer = dealers.find(d => d.id === user.dealerId);

  res.json({
    success: true,
    data: {
      token,
      user: { ...user, password: undefined, dealer },
    },
  });
});

app.get('/api/auth/me', authMiddleware, (req: any, res) => {
  const dealer = dealers.find(d => d.id === req.user.dealerId);
  res.json({ success: true, data: { ...req.user, password: undefined, dealer } });
});

// Customers
app.get('/api/customers', authMiddleware, (req: any, res) => {
  let data = customers;
  if (req.user.role === 'DEALER') {
    data = customers.filter(c => c.dealerId === req.user.dealerId);
  }
  res.json({ success: true, data, meta: { total: data.length } });
});

app.post('/api/customers', authMiddleware, (req: any, res) => {
  const newCustomer = {
    id: String(customers.length + 1),
    dealerId: req.user.dealerId || '1',
    ...req.body,
  };
  customers.push(newCustomer);
  res.json({ success: true, data: newCustomer });
});

app.get('/api/customers/stats', authMiddleware, (req: any, res) => {
  let data = customers;
  if (req.user.role === 'DEALER') {
    data = customers.filter(c => c.dealerId === req.user.dealerId);
  }
  res.json({ success: true, data: { totalCustomers: data.length } });
});

// Quotes
app.get('/api/quotes', authMiddleware, (req: any, res) => {
  let data = quotes.map(q => ({
    ...q,
    customer: customers.find(c => c.id === q.customerId),
    dealer: dealers.find(d => d.id === q.dealerId),
  }));
  if (req.user.role === 'DEALER') {
    data = data.filter(q => q.dealerId === req.user.dealerId);
  }
  res.json({ success: true, data, meta: { total: data.length } });
});

app.post('/api/quotes', authMiddleware, (req: any, res) => {
  const newQuote = {
    id: String(quotes.length + 1),
    quoteNumber: `TKL-2024-${String(quotes.length + 1).padStart(4, '0')}`,
    dealerId: req.user.dealerId || '1',
    status: 'DRAFT',
    totalAmount: 0,
    createdAt: new Date(),
    ...req.body,
  };
  quotes.push(newQuote);
  res.json({ success: true, data: newQuote });
});

app.post('/api/quotes/calculate', (req, res) => {
  const { systemType, width, height, quantity, includeFabric, fabricPrice, includeMotor, motorPrice, motorQty } = req.body;

  // Simple calculation
  const area = (width / 1000) * (height / 1000);
  const profileCost = area * 45 * quantity;
  const accessoryCost = area * 15 * quantity;
  const fabricCost = includeFabric ? area * (fabricPrice || 25) * quantity : 0;
  const motorCost = includeMotor ? (motorPrice || 180) * (motorQty || 1) : 0;

  const subtotal = profileCost + accessoryCost + fabricCost + motorCost;
  const profitMargin = subtotal * 0.15;
  const grandTotal = subtotal + profitMargin;

  res.json({
    success: true,
    data: {
      area,
      totalProfileCost: profileCost,
      totalAccessoryCost: accessoryCost,
      fabricCost,
      motorCost,
      subtotal,
      profitMargin,
      grandTotal,
    },
  });
});

// Orders
app.get('/api/orders', authMiddleware, (req: any, res) => {
  let data = orders.map(o => ({
    ...o,
    quote: quotes.find(q => q.id === o.quoteId),
    dealer: dealers.find(d => d.id === o.dealerId),
    _count: { recipes: 2 },
  }));
  if (req.user.role === 'DEALER') {
    data = data.filter(o => o.dealerId === req.user.dealerId);
  }
  res.json({ success: true, data });
});

app.get('/api/orders/stats', authMiddleware, (req: any, res) => {
  let data = orders;
  if (req.user.role === 'DEALER') {
    data = orders.filter(o => o.dealerId === req.user.dealerId);
  }
  res.json({
    success: true,
    data: {
      totalOrders: data.length,
      pendingOrders: data.filter(o => o.status === 'PENDING').length,
      inProductionOrders: data.filter(o => o.status === 'IN_PRODUCTION').length,
      completedOrders: data.filter(o => o.status === 'DELIVERED').length,
      recentOrders: data.length,
      totalRevenue: data.reduce((sum, o) => sum + o.totalAmount, 0),
    },
  });
});

// Dealers (Admin only)
app.get('/api/dealers', authMiddleware, (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
  res.json({ success: true, data: dealers });
});

app.get('/api/dealers/all-stats', authMiddleware, (req: any, res) => {
  res.json({
    success: true,
    data: {
      totalDealers: dealers.length,
      activeDealers: dealers.filter(d => d.isActive).length,
      totalUsers: users.filter(u => u.role === 'DEALER').length,
      avgProfitMargin: dealers.reduce((sum, d) => sum + d.profitMargin, 0) / dealers.length,
    },
  });
});

// Products (Admin only)
app.get('/api/products', authMiddleware, (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
  res.json({ success: true, data: products });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    BAYEDİ ERP Mock Server                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                               ║
║  API:    http://localhost:${PORT}/api                           ║
╠═══════════════════════════════════════════════════════════════╣
║  Test Hesapları:                                              ║
║  Admin: admin@bayedi.com / admin2024                          ║
║  Bayi:  bayi@bayedi.com / bayi2024                            ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
