import { betterAuth, type BaseURLConfig } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { Pool } from "pg";
import {
  assertDatabaseConfigured,
  databaseUrlOrPlaceholder,
} from "./database-url";

const DEV_AUTH_SECRET =
  "pourpilot-local-development-secret-change-me-please-32";

const authPool = new Pool({
  connectionString: databaseUrlOrPlaceholder(),
  max: 5,
});

export const auth = betterAuth({
  database: authPool,
  secret: process.env.BETTER_AUTH_SECRET || DEV_AUTH_SECRET,
  baseURL: authBaseURL(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [nextCookies()],
});

function authBaseURL(): BaseURLConfig {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;

  return {
    allowedHosts: [
      "localhost:*",
      "127.0.0.1:*",
      "0.0.0.0:*",
      "*.vercel.app",
      "*.vercel.sh",
      process.env.VERCEL_URL,
    ].filter((host): host is string => Boolean(host)),
    protocol: "auto",
  };
}

let migrationsPromise: Promise<void> | null = null;

export async function ensureAuthSchema(): Promise<void> {
  assertAuthRuntimeConfigured();
  migrationsPromise ??= getMigrations(auth.options).then(({ runMigrations }) =>
    runMigrations(),
  );
  await migrationsPromise;
}

export async function getAuthSession() {
  return getAuthSessionFromHeaders(await headers());
}

export async function getAuthSessionFromHeaders(requestHeaders: Headers) {
  await ensureAuthSchema();
  return auth.api.getSession({
    headers: requestHeaders,
  });
}

function assertAuthRuntimeConfigured(): void {
  assertDatabaseConfigured();

  if (process.env.BETTER_AUTH_SECRET) return;
  if (process.env.NODE_ENV !== "production") return;

  throw new Error(
    "Missing BETTER_AUTH_SECRET. Generate one with `openssl rand -base64 32`.",
  );
}
