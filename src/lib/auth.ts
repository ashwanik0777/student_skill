import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { account, session, user, verification } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  appName: "TestPrep",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
        },
      }
    : {},
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  // Profile and learning-track columns live on the same `user` table but are managed by our own
  // server actions (src/lib/actions/*) — Better Auth only handles identity, so they're not listed here.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // The signed session cookie spares a database lookup on every request. 30 minutes is safe here because
    // suspensions, revoked sessions and role changes are enforced from the (tag-invalidated) user row in
    // src/lib/session.ts, not from this cache.
    cookieCache: { enabled: true, maxAge: 30 * 60 },
  },
  // When the cookie cache does expire, load the session and its user in one joined query instead of two.
  advanced: { database: { joins: true } },
  databaseHooks: {
    user: {
      create: {
        // Admins can close public registration from /admin/settings (staff accounts are created directly, not here).
        before: async () => {
          const { general } = await getSettings();
          if (!general.signupsOpen) {
            throw new APIError("FORBIDDEN", { code: "SIGNUPS_CLOSED", message: "New sign-ups are paused right now. Please try again later." });
          }
        },
      },
    },
    session: {
      create: {
        // Suspended accounts can't start new sessions (existing ones are deleted when an admin suspends them).
        before: async (s) => {
          const row = await db.query.user.findFirst({ where: eq(user.id, s.userId), columns: { suspendedAt: true } });
          if (row?.suspendedAt) {
            throw new APIError("FORBIDDEN", {
              code: "ACCOUNT_SUSPENDED",
              message: "This account has been suspended. Please contact TestPrep support if you think this is a mistake.",
            });
          }
        },
      },
    },
  },
  rateLimit: { enabled: true, window: 60, max: 100 },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
