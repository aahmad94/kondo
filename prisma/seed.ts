const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Add Korean language
  await prisma.language.upsert({
    where: { code: 'ko' },
    update: {},
    create: {
      code: 'ko',
      name: 'Korean',
      isActive: true
    }
  });

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 