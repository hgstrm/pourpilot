const PLACEHOLDER_DATABASE_URL =
  "postgresql://pourpilot:pourpilot@127.0.0.1:1/pourpilot";

export function databaseUrl(): string {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

export function databaseUrlOrPlaceholder(): string {
  return databaseUrl() || PLACEHOLDER_DATABASE_URL;
}

export function assertDatabaseConfigured(): void {
  if (databaseUrl()) return;
  throw new Error(
    "No DATABASE_URL/POSTGRES_URL set. Add the Neon integration on Vercel " +
      "(or set it in .env.local) to enable PourPilot.",
  );
}
