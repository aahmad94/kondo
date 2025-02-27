// npx ts-node scripts/add-spanish-bookmarks.mts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Get Spanish language ID
    const spanish = await prisma.language.findUnique({
      where: { code: 'es' },
      select: { id: true }
    });

    if (!spanish) {
      console.error('Spanish language not found in database');
      return;
    }

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true }
    });

    // Define default bookmarks
    const defaultBookmarks = [
      { title: 'travel', isReserved: false },
      { title: 'counting', isReserved: false },
      { title: 'verbs', isReserved: false },
      { title: 'daily summary', isReserved: true },
      { title: 'all responses', isReserved: true }
    ];

    // Create Spanish bookmarks for each user
    for (const user of users) {
      // Check if user already has Spanish bookmarks
      const existingBookmarks = await prisma.bookmark.findMany({
        where: {
          userId: user.id,
          languageId: spanish.id
        }
      });

      if (existingBookmarks.length === 0) {
        // Create default bookmarks for Spanish
        await Promise.all(
          defaultBookmarks.map(bookmark =>
            prisma.bookmark.create({
              data: {
                title: bookmark.title,
                userId: user.id,
                languageId: spanish.id,
                isReserved: bookmark.isReserved
              }
            })
          )
        );
        console.log(`Created Spanish bookmarks for user ${user.id}`);
      } else {
        console.log(`User ${user.id} already has Spanish bookmarks`);
      }
    }

    console.log('Spanish bookmarks creation completed successfully');
  } catch (error) {
    console.error('Error creating Spanish bookmarks:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 