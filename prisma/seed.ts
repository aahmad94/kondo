import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Add Japanese language (referenced as default in auth)
  await prisma.language.upsert({
    where: { code: 'ja' },
    update: {},
    create: {
      code: 'ja',
      name: 'Japanese',
      isActive: true
    }
  });

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

  // Add Spanish language
  await prisma.language.upsert({
    where: { code: 'es' },
    update: {},
    create: {
      code: 'es',
      name: 'Spanish',
      isActive: true
    }
  });

  // Add Arabic language
  await prisma.language.upsert({
    where: { code: 'ar' },
    update: {},
    create: {
      code: 'ar',
      name: 'Arabic',
      isActive: true
    }
  });

  // Add Chinese language (has prompts in prompts folder)
  await prisma.language.upsert({
    where: { code: 'zh' },
    update: {},
    create: {
      code: 'zh',
      name: 'Chinese',
      isActive: true
    }
  });

  // Add Urdu language
  await prisma.language.upsert({
    where: { code: 'ur' },
    update: {},
    create: {
      code: 'ur',
      name: 'Urdu',
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