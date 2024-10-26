// pages/api/auth/[...nextauth].js
import NextAuth, { DefaultSession, NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaClient } from '@prisma/client';

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    userId: string;  // Add userId to the Session interface
  }
}

const prisma = new PrismaClient();
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
      } else {
        user.id = existingUser.id;
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
