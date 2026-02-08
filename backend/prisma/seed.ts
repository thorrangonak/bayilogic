import { PrismaClient, UserRole, ProductCategory, SystemType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminPassword = await bcrypt.hash('admin2024', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bayedi.com' },
    update: {},
    create: {
      email: 'admin@bayedi.com',
      password: adminPassword,
      firstName: 'Sistem',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      phone: '+90 212 000 0000',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Sample dealer
  const dealer = await prisma.dealer.upsert({
    where: { code: 'BAY-001' },
    update: {},
    create: {
      code: 'BAY-001',
      companyName: 'İstanbul Perde Ltd.',
      taxNumber: '1234567890',
      address: 'Kadıköy, İstanbul',
      city: 'İstanbul',
      phone: '+90 216 000 0000',
      email: 'info@istanbulperde.com',
      profitMargin: 15,
      discountRate: 5,
    },
  });
  console.log('✅ Dealer created:', dealer.companyName);

  // Dealer user
  const dealerPassword = await bcrypt.hash('bayi2024', 10);
  const dealerUser = await prisma.user.upsert({
    where: { email: 'bayi@bayedi.com' },
    update: {},
    create: {
      email: 'bayi@bayedi.com',
      password: dealerPassword,
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      role: UserRole.DEALER,
      phone: '+90 532 000 0000',
      dealerId: dealer.id,
    },
  });
  console.log('✅ Dealer user created:', dealerUser.email);

  // BYD100 Profiles
  const byd100Profiles = [
    { code: '10614', name: 'ALÜMİNYUM KASA', gramaj: 1.401, price: 4.8, multipliers: { widthMult: 1, heightMult: 0 } },
    { code: '10613', name: 'KASA KAPAK', gramaj: 0.607, price: 4.8, multipliers: { widthMult: 1, heightMult: 0 } },
    { code: '10624', name: 'ETEK ÇITASI', gramaj: 1.087, price: 4.8, multipliers: { widthMult: 1, heightMult: 0 } },
    { code: '10623', name: 'YAN DİKME KAPAĞI', gramaj: 0.298, price: 4.8, multipliers: { widthMult: 0, heightMult: 2 } },
    { code: '10622', name: 'YAN DİKME', gramaj: 0.875, price: 4.8, multipliers: { widthMult: 0, heightMult: 2 } },
    { code: '10178', name: '78mm GALVANİZ BORU', gramaj: 1.0, price: 5.5, multipliers: { widthMult: 1, heightMult: 0 } },
  ];

  for (const profile of byd100Profiles) {
    await prisma.product.upsert({
      where: { code: profile.code },
      update: { basePrice: profile.price, gramaj: profile.gramaj },
      create: {
        code: profile.code,
        name: profile.name,
        category: ProductCategory.PROFIL,
        systemType: SystemType.BYD100,
        unit: 'mt',
        gramaj: profile.gramaj,
        basePrice: profile.price,
        multipliers: profile.multipliers,
      },
    });
  }
  console.log('✅ BYD100 profiles created');

  // BYD125 Profiles
  const byd125Profiles = [
    { code: '10627', name: 'ALÜMİNYUM KASA', gramaj: 1.709, price: 4.8, multipliers: { widthMult: 1, heightMult: 0 } },
    { code: '10626', name: 'KASA KAPAK', gramaj: 1.033, price: 4.8, multipliers: { widthMult: 1, heightMult: 0 } },
    { code: '10624B', name: 'ETEK ÇITASI', gramaj: 1.087, price: 4.8, multipliers: { widthMult: 1, heightMult: 0 } },
  ];

  for (const profile of byd125Profiles) {
    await prisma.product.upsert({
      where: { code: profile.code },
      update: { basePrice: profile.price, gramaj: profile.gramaj },
      create: {
        code: profile.code,
        name: profile.name,
        category: ProductCategory.PROFIL,
        systemType: SystemType.BYD125,
        unit: 'mt',
        gramaj: profile.gramaj,
        basePrice: profile.price,
        multipliers: profile.multipliers,
      },
    });
  }
  console.log('✅ BYD125 profiles created');

  // Accessories
  const accessories = [
    { code: 'BYD10-114DK', name: 'Yan Sac', unit: 'tk', price: 10 },
    { code: 'BYD10-113SK', name: 'Süs Kapağı', unit: 'tk', price: 10 },
    { code: 'ZG0256', name: 'Fermuar Kılavuzu', unit: 'ad', price: 1.2 },
    { code: 'ZIP-REG-101', name: 'Fermuar', unit: 'mt', price: 2.1 },
  ];

  for (const acc of accessories) {
    await prisma.product.upsert({
      where: { code: acc.code },
      update: { basePrice: acc.price },
      create: {
        code: acc.code,
        name: acc.name,
        category: ProductCategory.APARAT,
        systemType: SystemType.ALL,
        unit: acc.unit,
        basePrice: acc.price,
      },
    });
  }
  console.log('✅ Accessories created');

  // Motors
  const motors = [
    { code: 'MTR-SOMFY-001', name: 'Somfy Motor', price: 150 },
    { code: 'MTR-MOSEL-001', name: 'Mosel Motor', price: 120 },
    { code: 'MTR-NICE-001', name: 'Nice Motor', price: 130 },
  ];

  for (const motor of motors) {
    await prisma.product.upsert({
      where: { code: motor.code },
      update: { basePrice: motor.price },
      create: {
        code: motor.code,
        name: motor.name,
        category: ProductCategory.MOTOR,
        systemType: SystemType.ALL,
        unit: 'ad',
        basePrice: motor.price,
      },
    });
  }
  console.log('✅ Motors created');

  // Sample customer
  const customer = await prisma.customer.upsert({
    where: { id: 'sample-customer-1' },
    update: {},
    create: {
      id: 'sample-customer-1',
      dealerId: dealer.id,
      companyName: 'ABC İnşaat A.Ş.',
      contactName: 'Mehmet Kaya',
      phone: '+90 533 111 2233',
      email: 'mehmet@abcinsaat.com',
      city: 'İstanbul',
    },
  });
  console.log('✅ Sample customer created:', customer.companyName);

  console.log('');
  console.log('🎉 Database seeding completed!');
  console.log('');
  console.log('📋 Test Credentials:');
  console.log('   Admin: admin@bayedi.com / admin2024');
  console.log('   Bayi:  bayi@bayedi.com / bayi2024');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
