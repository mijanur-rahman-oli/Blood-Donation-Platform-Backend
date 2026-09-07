import { PrismaClient, Role, AuthProvider, BloodGroup } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

async function main() {
  console.log('🌱 Seeding database...');

  // ---------- Admin ----------
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@blooddonation.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const hashedAdminPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Platform Admin',
      email: adminEmail,
      password: hashedAdminPassword,
      role: Role.ADMIN,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
    },
  });
  console.log(`✅ Admin ready: ${admin.email} / ${adminPassword}`);

  // ---------- Sample Donors ----------
  const donorSeeds = [
    { name: 'Karim Rahman', email: 'karim.donor@example.com', bloodGroup: BloodGroup.O_NEGATIVE, location: 'Sylhet' },
    { name: 'Fatema Begum', email: 'fatema.donor@example.com', bloodGroup: BloodGroup.A_POSITIVE, location: 'Dhaka' },
    { name: 'Jahid Hasan', email: 'jahid.donor@example.com', bloodGroup: BloodGroup.B_POSITIVE, location: 'Sylhet' },
  ];

  const donorPassword = await bcrypt.hash('Donor@12345', SALT_ROUNDS);

  for (const seed of donorSeeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {},
      create: {
        name: seed.name,
        email: seed.email,
        password: donorPassword,
        role: Role.DONOR,
        provider: AuthProvider.LOCAL,
        isEmailVerified: true,
      },
    });

    await prisma.donorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bloodGroup: seed.bloodGroup,
        location: seed.location,
        availability: true,
        isEligible: true,
        ageYears: 28,
        weightKg: 65,
      },
    });
  }
  console.log(`✅ Seeded ${donorSeeds.length} donors (password: Donor@12345)`);

  // ---------- Sample Requester ----------
  const requesterPassword = await bcrypt.hash('Requester@12345', SALT_ROUNDS);
  const requester = await prisma.user.upsert({
    where: { email: 'requester@example.com' },
    update: {},
    create: {
      name: 'Sample Requester',
      email: 'requester@example.com',
      password: requesterPassword,
      role: Role.REQUESTER,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
    },
  });
  console.log(`✅ Seeded requester: ${requester.email} / Requester@12345`);

  console.log('🌱 Seeding complete.');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
