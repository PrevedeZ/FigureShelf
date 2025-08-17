import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(String(credentials.password), user.password);
        if (!ok) return null;

        // What becomes available in `user` during jwt callback
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role as "USER" | "ADMIN",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in `user` is defined; on subsequent calls it's undefined
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string | undefined;
        (session.user as any).role = token.role as ("USER" | "ADMIN") | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
