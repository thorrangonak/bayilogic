import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './modules/auth/auth.routes';
import quotesRoutes from './modules/quotes/quotes.routes';
import customersRoutes from './modules/customers/customers.routes';
import dealersRoutes from './modules/dealers/dealers.routes';
import productsRoutes from './modules/products/products.routes';
import usersRoutes from './modules/users/users.routes';
import ordersRoutes from './modules/orders/orders.routes';

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: config.app.version,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/dealers', dealersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);

// Placeholder routes (gelecek modüller)
app.use('/api/production', (req, res) => res.json({ message: 'Production module - coming soon' }));
app.use('/api/inventory', (req, res) => res.json({ message: 'Inventory module - coming soon' }));
app.use('/api/reports', (req, res) => res.json({ message: 'Reports module - coming soon' }));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   🏭 BAYEDİ ERP Backend API                               ║');
  console.log('║                                                           ║');
  console.log(`║   🚀 Server running on port ${config.port}                        ║`);
  console.log(`║   📁 Environment: ${config.nodeEnv.padEnd(29)}║`);
  console.log('║                                                           ║');
  console.log('║   Active Modules:                                         ║');
  console.log('║   ✅ Auth       - /api/auth                               ║');
  console.log('║   ✅ Quotes     - /api/quotes                             ║');
  console.log('║   ✅ Customers  - /api/customers                          ║');
  console.log('║   ✅ Dealers    - /api/dealers                            ║');
  console.log('║   ✅ Products   - /api/products                           ║');
  console.log('║   ✅ Users      - /api/users                              ║');
  console.log('║   ✅ Orders     - /api/orders                             ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
});

export default app;
