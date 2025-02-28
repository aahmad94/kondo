// npx tsx scripts/add-arabic-bookmarks.mts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Get Arabic language ID
    const arabic = await prisma.language.findUnique({
      where: { code: 'ar' },
      select: { id: true }
    });

    if (!arabic) {
      console.error('Arabic language not found in database');
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

    // Create Arabic bookmarks for each user
    for (const user of users) {
      // Check if user already has Arabic bookmarks
      const existingBookmarks = await prisma.bookmark.findMany({
        where: {
          userId: user.id,
          languageId: arabic.id
        }
      });

      if (existingBookmarks.length === 0) {
        // Create default bookmarks for Arabic
        await Promise.all(
          defaultBookmarks.map(bookmark =>
            prisma.bookmark.create({
              data: {
                title: bookmark.title,
                userId: user.id,
                languageId: arabic.id,
                isReserved: bookmark.isReserved
              }
            })
          )
        );
        console.log(`Created Arabic bookmarks for user ${user.id}`);
      } else {
        console.log(`User ${user.id} already has Arabic bookmarks`);
      }
    }

    console.log('Arabic bookmarks creation completed successfully');
  } catch (error) {
    console.error('Error creating Arabic bookmarks:', error);
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