import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./db.js";

// Creates the first admin account from .env so you can log into the panel.
async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin "${username}" already exists — skipping.`);
    return;
  }

  await prisma.admin.create({
    data: { username, passwordHash: await bcrypt.hash(password, 10) }
  });
  console.log(`Created admin "${username}" (password: ${password}). Change it after first login.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
