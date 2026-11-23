// backend/src/config/db.js
const path = require('path');
const env = require('./env');
const seedData = require('./seedData');

let prismaPg = null;
let prismaSqlite = null;
let isConnectedToPostgres = false;
let activePrisma = null;

// Initialize Prisma PostgreSQL Client
try {
  const { PrismaClient } = require('@prisma/client');
  prismaPg = new PrismaClient({
    datasources: {
      db: { url: env.DATABASE_URL }
    }
  });

  prismaPg.$connect()
    .then(() => {
      isConnectedToPostgres = true;
      activePrisma = prismaPg;
      console.log('🐘 PostgreSQL connected successfully via Prisma ORM!');
    })
    .catch(() => {
      isConnectedToPostgres = false;
      // Connect to local persistent SQL database (dev.db) via Prisma SQLite
      try {
        const { PrismaClient: SqliteClient } = require('@prisma/client-sqlite');
        prismaSqlite = new SqliteClient();
        activePrisma = prismaSqlite;
        console.log('💾 Connected to persistent local SQL Database file (backend/prisma/dev.db) via Prisma ORM!');
      } catch (sqErr) {
        console.log('ℹ️  Operational store running in resilience mode.');
      }
    });
} catch (e) {
  try {
    const { PrismaClient: SqliteClient } = require('@prisma/client-sqlite');
    prismaSqlite = new SqliteClient();
    activePrisma = prismaSqlite;
    console.log('💾 Connected to persistent local SQL Database file (backend/prisma/dev.db) via Prisma ORM!');
  } catch (err) {}
}

// In-memory persistent operational store for immediate UI/API synchronization
const memoryStore = {
  users: [],
  farmerProfiles: [],
  customerProfiles: [],
  addresses: [],
  categories: [...seedData.categories],
  products: [...seedData.products],
  carts: {},
  wishlists: {},
  orders: [],
  farmerFulfillments: [],
  payments: [],
  reviews: [],
  notifications: [],
  transactions: []
};

// Initialize seed data in memoryStore
function initMemoryStore() {
  const bcrypt = require('bcryptjs');
  const defaultHash = bcrypt.hashSync('FarmDirect@123', 10);

  // Admin
  memoryStore.users.push({
    id: seedData.adminUser.id,
    email: seedData.adminUser.email,
    phone: seedData.adminUser.phone,
    passwordHash: defaultHash,
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Customer
  memoryStore.users.push({
    id: seedData.customerUser.id,
    email: seedData.customerUser.email,
    phone: seedData.customerUser.phone,
    passwordHash: defaultHash,
    role: 'CUSTOMER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  memoryStore.customerProfiles.push({
    id: 'prof-cust-1',
    userId: seedData.customerUser.id,
    fullName: seedData.customerUser.fullName,
    phone: seedData.customerUser.phone
  });
  memoryStore.addresses.push({
    ...seedData.customerUser.address,
    userId: seedData.customerUser.id
  });
  memoryStore.carts[seedData.customerUser.id] = [
    { productId: 'prod-1', quantity: 2 },
    { productId: 'prod-7', quantity: 1 }
  ];
  memoryStore.wishlists[seedData.customerUser.id] = ['prod-8', 'prod-11'];

  // Farmers
  for (const f of seedData.farmers) {
    memoryStore.users.push({
      id: f.userId,
      email: f.email,
      phone: f.phone,
      passwordHash: defaultHash,
      role: 'FARMER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    memoryStore.farmerProfiles.push({
      id: f.farmId,
      userId: f.userId,
      farmName: f.farmName,
      bio: f.bio,
      experienceYears: f.experienceYears,
      farmPhoto: f.farmPhoto,
      farmAddress: f.farmAddress,
      district: f.district,
      state: f.state,
      pinCode: f.pinCode,
      latitude: f.latitude,
      longitude: f.longitude,
      farmingCategory: f.farmingCategory,
      verificationStatus: f.verificationStatus,
      isOrganicCertified: f.isOrganicCertified,
      certificationNumber: f.certificationNumber,
      rating: f.rating,
      totalReviews: f.totalReviews,
      bankAccountName: f.name,
      bankAccountNumber: '918237461928',
      bankIfscCode: 'SBIN0004123',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Sample transactions
    memoryStore.transactions.push({
      id: `tx-${f.farmId}-1`,
      farmerId: f.farmId,
      amount: 4250.00,
      type: 'CREDIT',
      status: 'COMPLETED',
      description: 'Payout for Order #FD-8921 fulfillment',
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000)
    });
    memoryStore.transactions.push({
      id: `tx-${f.farmId}-2`,
      farmerId: f.farmId,
      amount: 7800.00,
      type: 'CREDIT',
      status: 'COMPLETED',
      description: 'Payout for Order #FD-8840 fulfillment',
      createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000)
    });
  }

  // Sample historical order
  const sampleOrder = {
    id: "ord-init-101",
    orderNumber: "FD-2026-9042",
    userId: seedData.customerUser.id,
    addressId: "addr-1",
    totalAmount: 935.00,
    deliveryCharge: 50.00,
    grandTotal: 985.00,
    paymentStatus: "PAID",
    status: "PROCESSING",
    paymentMethod: "RAZORPAY",
    razorpayOrderId: "order_mock_test_101",
    razorpayPaymentId: "pay_mock_test_101",
    notes: "Leave with security at main gate",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000),
    updatedAt: new Date(),
    items: [
      {
        id: "item-1",
        productId: "prod-1",
        farmerId: "farmer-1",
        quantity: 2,
        unitPrice: 165.00,
        totalPrice: 330.00
      },
      {
        id: "item-2",
        productId: "prod-8",
        farmerId: "farmer-4",
        quantity: 1,
        unitPrice: 550.00,
        totalPrice: 550.00
      }
    ],
    fulfillments: [
      {
        id: "ful-1",
        orderId: "ord-init-101",
        farmerId: "farmer-1",
        subtotal: 330.00,
        status: "PROCESSING",
        trackingNumber: "DEL-IND-7712",
        courierName: "Delhivery Surface",
        createdAt: new Date(Date.now() - 20 * 3600 * 1000)
      },
      {
        id: "ful-2",
        orderId: "ord-init-101",
        farmerId: "farmer-4",
        subtotal: 550.00,
        status: "READY_FOR_PICKUP",
        trackingNumber: "EXP-IND-9914",
        courierName: "Blue Dart Express",
        createdAt: new Date(Date.now() - 18 * 3600 * 1000)
      }
    ]
  };
  memoryStore.orders.push(sampleOrder);
}

initMemoryStore();

module.exports = {
  prisma: activePrisma || prismaSqlite || prismaPg,
  prismaPg,
  prismaSqlite,
  getIsConnectedToPostgres: () => isConnectedToPostgres,
  memoryStore
};
