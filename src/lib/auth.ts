import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { supabase } from "./db";
import { env } from "./env";
import { logger } from "./logger";

// Enhanced password validation
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const credentialsSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const authOptions = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          logger.warn({ errors: parsed.error.format() }, "Invalid credentials format");
          return null;
        }

        const { email, password } = parsed.data;
        try {
          logger.info({ email }, "Attempting to authorize user");
          const { data: user, error } = await supabase
            .from('users')
            .select('id, email, password_hash, role')
            .eq('email', email)
            .single();

          if (error || !user) {
            logger.warn({ email, error }, "User not found in database");
            return null;
          }

          const valid = await bcrypt.compare(password, (user as any).password_hash);
          if (!valid) {
            logger.warn({ email }, "Invalid password");
            return null;
          }

          logger.info({ email, role: (user as any).role }, "User authorized successfully");
          return {
            id: (user as any).id,
            email: (user as any).email,
            role: (user as any).role,
          };
        } catch (error) {
          logger.error({ error, email }, "Error in authorize function");
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.sub = user.id;
        token.role = user.role;
      }
      
      // Refresh token on session update
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }
      
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id as string;
        session.user.sub = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
