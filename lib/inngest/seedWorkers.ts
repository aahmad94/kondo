import { Inngest } from 'inngest';
import { prisma } from '@/lib/database';
import { ensureDefaultDecksAndSeeds } from '@/lib/bookmarks/seedProvisionService';

const inngest = new Inngest({ id: 'Kondo' });

export const provisionUserSeedDecksFunction = inngest.createFunction(
  {
    id: 'provision-user-seed-decks',
    triggers: [{ event: 'user.provision.seed-decks' }],
  },
  async ({ event, step }) => {
    const { userId, skipLanguageId } = event.data as {
      userId: string;
      skipLanguageId?: string;
    };

    const languages = await step.run('list-languages', async () => {
      return prisma.language.findMany({
        where: {
          isActive: true,
          ...(skipLanguageId ? { id: { not: skipLanguageId } } : {}),
        },
        select: { id: true, code: true },
      });
    });

    for (const language of languages) {
      await step.run(`seed-${language.code}`, async () => {
        await ensureDefaultDecksAndSeeds(userId, language.id);
      });
    }

    return { userId, languages: languages.map((language) => language.code) };
  }
);
