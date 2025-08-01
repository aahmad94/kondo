import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type Theme = 'light' | 'dark';

export async function getUserTheme(userEmail: string): Promise<Theme> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
      },
      select: {
        theme: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return (user.theme as Theme) || 'light';
  } finally {
    await prisma.$disconnect();
  }
}

export async function updateUserTheme(userEmail: string, theme: Theme): Promise<Theme> {
  try {
    const updatedUser = await prisma.user.update({
      where: {
        email: userEmail,
      },
      data: {
        theme: theme,
      },
      select: {
        theme: true,
      },
    });

    return updatedUser.theme as Theme;
  } finally {
    await prisma.$disconnect();
  }
} 