// backend/prisma/seedSqlite.js
const { PrismaClient } = require('@prisma/client-sqlite');
const bcrypt = require('bcryptjs');
const { categories, farmers, products, customerUser, adminUser } = require('../src/config/seedData');

const prisma = new PrismaClient();

async function main() {
  console.log('🌾 Seeding real persistent SQL database (dev.db)...');
  const defaultPasswordHash = await bcrypt.hash('FarmDirect@123', 10);

  // 1. Admin
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

  // 2. Customer
  await prisma.user.upsert({
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
      }
    }
  });

  // 3. Categories
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }

  // 4. Farmers
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

  // 5. Products
  for (const p of products) {
    const { images, harvestDate, ...productData } = p;
    const formattedData = {
      ...productData,
      harvestDate: harvestDate ? new Date(`${harvestDate}T00:00:00.000Z`) : null,
    };

    await prisma.product.upsert({
      where: { id: p.id },
      update: formattedData,
      create: {
        ...formattedData,
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

  const userCount = await prisma.user.count();
  const farmerCount = await prisma.farmerProfile.count();
  const productCount = await prisma.product.count();

  console.log(`✅ Real SQL Database Seeded Successfully!`);
  console.log(`   Users in DB: ${userCount} | Farmers: ${farmerCount} | Products: ${productCount}`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
