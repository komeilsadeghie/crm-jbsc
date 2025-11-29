import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@example.com";
  const adminUsername = "admin";

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: adminEmail }, { username: adminUsername }] },
  });

  if (!existing) {
    const hashed = await bcrypt.hash("admin123", 10);

    await prisma.user.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        password: hashed,
        role: "admin",
      },
    });

    console.log("🌟 Default admin user created: admin / admin123");
  } else {
    console.log("Admin user already exists");
  }
}

main().finally(() => prisma.$disconnect());
