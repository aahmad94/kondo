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

    return (user.theme as Theme) || 'dark';
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

export type LandingPage = 'create' | 'dojo' | 'community';

export async function getLandingPage(userEmail: string): Promise<LandingPage> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
      },
      select: {
        landingPage: true,
      },
    });

    if (!user?.landingPage) {
      return 'community';
    }

    const valid: LandingPage[] = ['create', 'dojo', 'community'];
    return valid.includes(user.landingPage as LandingPage) ? (user.landingPage as LandingPage) : 'community';
  } finally {
    await prisma.$disconnect();
  }
}

export async function updateLandingPage(userEmail: string, landingPage: LandingPage): Promise<LandingPage> {
  try {
    const updatedUser = await prisma.user.update({
      where: {
        email: userEmail,
      },
      data: {
        landingPage,
      },
      select: {
        landingPage: true,
      },
    });

    return (updatedUser.landingPage ?? 'community') as LandingPage;
  } finally {
    await prisma.$disconnect();
  }
} 