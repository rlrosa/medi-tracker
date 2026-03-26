const { PrismaClient } = require('@prisma/client');

async function warmUp() {
  const prisma = new PrismaClient();
  let attempts = 0;
  const maxAttempts = 10;

  console.log('🔥 Warming up Neon database...');

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`📡 Attempt ${attempts}/${maxAttempts}...`);
      await prisma.$connect();
      const result = await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Success! Database is warm and responsive.');
      await prisma.$disconnect();
      return true;
    } catch (error) {
      console.warn(`⏳ Attempt ${attempts} failed: ${error.message}`);
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
      }
    }
  }

  console.error('❌ Failed to warm up database after multiple attempts.');
  return false;
}

warmUp();
