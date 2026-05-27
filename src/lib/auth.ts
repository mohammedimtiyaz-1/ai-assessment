import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSupabaseAdmin } from "./db";
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
        logger.info({ credentials }, "Authorize function called with credentials");
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          logger.warn({ errors: parsed.error.format() }, "Invalid credentials format");
          return null;
        }

        const { email, password } = parsed.data;
        try {
          logger.info({ email }, "Attempting to authorize user");
          const supabaseAdmin = getSupabaseAdmin();
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('id, email, password_hash, role')
            .eq('email', email)
            .single();

          logger.info({ userFound: !!user, error }, "User query result");

          if (error || !user) {
            logger.warn({ email, error }, "User not found in database");
            return null;
          }

          const valid = await bcrypt.compare(password, (user as any).password_hash);
          logger.info({ passwordValid: valid }, "Password comparison result");

          if (!valid) {
            logger.warn({ email }, "Invalid password");
            return null;
          }

          const userObj = {
            id: (user as any).id,
            email: (user as any).email,
            role: (user as any).role,
          };
          logger.info({ email, role: (user as any).role, userObj }, "User authorized successfully, returning user object");
          return userObj;
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
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false, // Set to true in production with HTTPS
      },
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      logger.info({ hasUser: !!user, trigger }, "JWT callback");
      if (user) {
        token.id = user.id;
        token.sub = user.id;
        token.role = user.role;
        token.email = user.email;
        logger.info({ userId: user.id, userEmail: user.email }, "User added to token");
      }
      
      // Refresh token on session update
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }
      
      logger.info({ token: !!token, hasId: !!token?.id }, "Token after processing");
      return token;
    },
    async session({ session, token }: any) {
      logger.info({ hasToken: !!token, hasSession: !!session }, "Session callback");
      if (token) {
        session.user.id = token.id as string;
        session.user.sub = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        logger.info({ userId: token.id, userRole: token.role }, "User added to session");
      }
      logger.info({ session: !!session }, "Session after processing");
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
