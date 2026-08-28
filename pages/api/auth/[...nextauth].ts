// pages/api/auth/[...nextauth].js
import NextAuth, { DefaultSession, NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import {
  prisma,
  ensureDefaultDecksAndSeeds,
  ensureDefaultDecksAndSeedsForAllActiveLanguages,
} from '@/lib'

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    userId: string;  // Add userId to the Session interface
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',  // Add error page
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false; 
      const { email } = user
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (!existingUser) {
        const newUser = await prisma.user.create({
          data: { email, name: user.name },
        });
        user.id = newUser.id;

        await ensureDefaultDecksAndSeedsForAllActiveLanguages(newUser.id);

        // Set Japanese as the default language preference
        const japanese = await prisma.language.findUnique({
          where: { code: 'ja' },
          select: { id: true }
        });

        if (japanese) {
          await prisma.userLanguagePreference.create({
            data: {
              userId: newUser.id,
              languageId: japanese.id
            }
          });
        }
      } else {
        user.id = existingUser.id;
        const preference = await prisma.userLanguagePreference.findUnique({
          where: { userId: existingUser.id },
          select: { languageId: true },
        });
        if (preference) {
          await ensureDefaultDecksAndSeeds(existingUser.id, preference.languageId);
        }
      }
      return true;
    },
    async session({ session, user, token }) {
      if (token && token.sub) {
        session.userId = token.sub;  // Use token.sub as a fallback for user ID
      } else if (user && user.id) {
        session.userId = user.id;  // Add custom user ID to the session
      }
      return session;
    }
  }
}

export default NextAuth(authOptions)
