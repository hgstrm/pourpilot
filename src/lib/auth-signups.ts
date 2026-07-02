import { neon } from "@neondatabase/serverless";
import { assertDatabaseConfigured, databaseUrl } from "./database-url";

type CountRow = { count: string | number };

export async function canCreateAccount(): Promise<boolean> {
  if (process.env.ALLOW_SIGNUPS === "true") return true;
  return (await authUserCount()) === 0;
}

async function authUserCount(): Promise<number> {
  assertDatabaseConfigured();
  const sql = neon(databaseUrl());
  const rows = (await sql`
    SELECT COUNT(*) AS count FROM "user"
  `) as CountRow[];
  return Number(rows[0]?.count ?? 0);
}
