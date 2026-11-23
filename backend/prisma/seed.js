// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { categories, farmers, products, customerUser, adminUser } = require('../src/config/seedData');

const prisma = new PrismaClient();

async function main() {
  console.log('🌾 Starting FarmDirect database seed...');
  const defaultPasswordHash = await bcrypt.hash('FarmDirect@123', 10);

  // 1. Seed Admin
  console.log('Creating Admin account...');
  await prisma.user.upsert({
    where: { email: adminUser.email },
    update: {},
    create: {
      id: adminUser.id,
      email: adminUser.email,
      phone: adminUser.phone,
      passwordHash: defaultPasswordHash,
      role: 'ADMIN',
      isActive: true,
      customerProfile: {
        create: {
          fullName: adminUser.fullName,
        }
      }
    }
  });

  // 2. Seed Customer
  console.log('Creating Customer account...');
  const customer = await prisma.user.upsert({
    where: { email: customerUser.email },
    update: {},
    create: {
      id: customerUser.id,
      email: customerUser.email,
      phone: customerUser.phone,
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER',
      isActive: true,
      customerProfile: {
        create: {
          fullName: customerUser.fullName,
          phone: customerUser.phone,
        }
      },
      addresses: {
        create: {
          id: customerUser.address.id,
          fullName: customerUser.address.fullName,
          phone: customerUser.address.phone,
          houseNumber: customerUser.address.houseNumber,
          street: customerUser.address.street,
          landmark: customerUser.address.landmark,
          city: customerUser.address.city,
          district: customerUser.address.district,
          state: customerUser.address.state,
          pinCode: customerUser.address.pinCode,
          isDefault: true,
        }
      },
      cart: { create: {} },
      wishlist: { create: {} }
    }
  });

  // 3. Seed Categories
  console.log('Seeding Product Categories...');
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }

  // 4. Seed Farmers
  console.log('Seeding Farmers...');
  for (const f of farmers) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      update: {},
      create: {
        id: f.userId,
        email: f.email,
        phone: f.phone,
        passwordHash: defaultPasswordHash,
        role: 'FARMER',
        isActive: true,
      }
    });

    await prisma.farmerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: f.farmId,
        userId: user.id,
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
      }
    });
  }

  // 5. Seed Products
  console.log('Seeding Products and Images...');
  for (const p of products) {
    const { images, ...productData } = p;
    await prisma.product.upsert({
      where: { id: p.id },
      update: productData,
      create: {
        ...productData,
        images: {
          create: images.map((img, idx) => ({
            imageUrl: img.imageUrl,
            isPrimary: img.isPrimary,
            sortOrder: idx,
          }))
        }
      }
    });
  }

  console.log('✅ FarmDirect Database Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
