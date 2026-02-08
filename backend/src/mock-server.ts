import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors({ origin: true, credentials: true }));
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

let customers = [
  { id: '1', dealerId: '1', companyName: 'ABC İnşaat A.Ş.', contactName: 'Ali Kaya', phone: '+90 532 111 2233', email: 'ali@abc.com', city: 'İstanbul', _count: { quotes: 2 } },
  { id: '2', dealerId: '1', companyName: 'XYZ Yapı Ltd.', contactName: 'Veli Koç', phone: '+90 533 444 5566', email: 'veli@xyz.com', city: 'İzmir', _count: { quotes: 1 } },
];

let quotes = [
  { id: '1', quoteNumber: 'TKL-2024-0001', dealerId: '1', customerId: '1', status: 'DRAFT', totalAmount: 2500, createdAt: new Date().toISOString() },
  { id: '2', quoteNumber: 'TKL-2024-0002', dealerId: '1', customerId: '2', status: 'SENT', totalAmount: 3800, createdAt: new Date().toISOString() },
  { id: '3', quoteNumber: 'TKL-2024-0003', dealerId: '1', customerId: '1', status: 'APPROVED', totalAmount: 5200, createdAt: new Date().toISOString() },
];

let orders = [
  { id: '1', orderNumber: 'SIP-2024-0001', dealerId: '1', quoteId: '3', status: 'PENDING', totalAmount: 5200, createdAt: new Date().toISOString() },
];

const products = [
  { id: '1', code: 'PRF-001', name: 'Dikey Kasa Profili', category: 'PROFIL', system: 'BYD100', unit: 'mt', unitPrice: 12.5, gramaj: 0.85 },
  { id: '2', code: 'PRF-002', name: 'Alt Profil', category: 'PROFIL', system: 'BYD100', unit: 'mt', unitPrice: 8.2, gramaj: 0.65 },
  { id: '3', code: 'PRF-003', name: 'Üst Profil', category: 'PROFIL', system: 'BYD100', unit: 'mt', unitPrice: 9.5, gramaj: 0.72 },
  { id: '4', code: 'PRF-004', name: 'Yan Profil', category: 'PROFIL', system: 'BYD125', unit: 'mt', unitPrice: 14.2, gramaj: 0.95 },
  { id: '5', code: 'APR-001', name: 'Köşe Bağlantı', category: 'APARAT', system: 'BYD100', unit: 'ad', unitPrice: 2.5 },
  { id: '6', code: 'APR-002', name: 'T Bağlantı', category: 'APARAT', system: 'BYD100', unit: 'ad', unitPrice: 3.2 },
  { id: '7', code: 'MTR-001', name: 'Somfy Motor', category: 'MOTOR', system: 'ALL', unit: 'ad', unitPrice: 180 },
  { id: '8', code: 'MTR-002', name: 'Nice Motor', category: 'MOTOR', system: 'ALL', unit: 'ad', unitPrice: 150 },
  { id: '9', code: 'KMD-001', name: 'Standart Kumanda', category: 'KUMANDA', system: 'ALL', unit: 'ad', unitPrice: 25 },
  { id: '10', code: 'KMD-002', name: 'Wifi Kumanda', category: 'KUMANDA', system: 'ALL', unit: 'ad', unitPrice: 65 },
];

// Auth middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token gerekli' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = users.find(u => u.id === decoded.userId);
    if (!req.user) throw new Error('User not found');
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
  }
};

// Routes

// Health check
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

app.get('/api/customers/:id', authMiddleware, (req: any, res) => {
  const customer = customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı' });
  res.json({ success: true, data: customer });
});

app.post('/api/customers', authMiddleware, (req: any, res) => {
  const newCustomer = {
    id: String(Date.now()),
    dealerId: req.user.dealerId || '1',
    _count: { quotes: 0 },
    ...req.body,
  };
  customers.push(newCustomer);
  res.json({ success: true, data: newCustomer });
});

app.put('/api/customers/:id', authMiddleware, (req: any, res) => {
  const index = customers.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Müşteri bulunamadı' });
  customers[index] = { ...customers[index], ...req.body };
  res.json({ success: true, data: customers[index] });
});

app.delete('/api/customers/:id', authMiddleware, (req: any, res) => {
  const index = customers.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Müşteri bulunamadı' });
  customers.splice(index, 1);
  res.json({ success: true });
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

app.get('/api/quotes/:id', authMiddleware, (req: any, res) => {
  const quote = quotes.find(q => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Teklif bulunamadı' });
  res.json({
    success: true,
    data: {
      ...quote,
      customer: customers.find(c => c.id === quote.customerId),
      dealer: dealers.find(d => d.id === quote.dealerId),
      items: [],
    },
  });
});

app.post('/api/quotes', authMiddleware, (req: any, res) => {
  const newQuote = {
    id: String(Date.now()),
    quoteNumber: `TKL-2024-${String(quotes.length + 1).padStart(4, '0')}`,
    dealerId: req.user.dealerId || '1',
    status: 'DRAFT',
    totalAmount: 0,
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  quotes.push(newQuote);
  res.json({ success: true, data: newQuote });
});

app.post('/api/quotes/:id/items', authMiddleware, (req: any, res) => {
  res.json({ success: true, data: { id: String(Date.now()), ...req.body } });
});

app.post('/api/quotes/:id/send', authMiddleware, (req: any, res) => {
  const quote = quotes.find(q => q.id === req.params.id);
  if (quote) quote.status = 'SENT';
  res.json({ success: true });
});

app.post('/api/quotes/calculate', (req, res) => {
  const { systemType, width, height, quantity, includeFabric, fabricPrice, fabricQty, includeMotor, motorPrice, motorQty, remotePrice, remoteQty } = req.body;

  const area = (width / 1000) * (height / 1000);
  const profileCost = area * 45 * quantity;
  const accessoryCost = area * 15 * quantity;
  const fabricCost = includeFabric ? area * (fabricPrice || 25) * (fabricQty || 1) : 0;
  const motorCost = includeMotor ? (motorPrice || 180) * (motorQty || 1) : 0;
  const remoteCost = includeMotor ? (remotePrice || 25) * (remoteQty || 0) : 0;

  const subtotal = profileCost + accessoryCost + fabricCost + motorCost + remoteCost;
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

app.put('/api/orders/:id/status', authMiddleware, (req: any, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
  order.status = req.body.status;
  res.json({ success: true, data: order });
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
  const { category, system, search } = req.query;
  let data = products;
  if (category && category !== 'ALL') data = data.filter(p => p.category === category);
  if (system && system !== 'ALL') data = data.filter(p => p.system === system || p.system === 'ALL');
  if (search) data = data.filter(p => p.code.includes(String(search)) || p.name.includes(String(search)));
  res.json({ success: true, data });
});

app.put('/api/products/bulk-prices', authMiddleware, (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
  const updates = req.body as { id: string; unitPrice?: number; gramaj?: number }[];
  updates.forEach(u => {
    const product = products.find(p => p.id === u.id);
    if (product) {
      if (u.unitPrice !== undefined) product.unitPrice = u.unitPrice;
      if (u.gramaj !== undefined) product.gramaj = u.gramaj;
    }
  });
  res.json({ success: true });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    BAYEDİ ERP Mock Server                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                                ║
╠═══════════════════════════════════════════════════════════════╣
║  Test Hesapları:                                              ║
║  Admin: admin@bayedi.com / admin2024                          ║
║  Bayi:  bayi@bayedi.com / bayi2024                            ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
