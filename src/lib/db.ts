import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { BeanInfo, RecipeOutput } from "./recipe-schema";

// Neon serverless Postgres. Connection string is provided by the Vercel
// Neon integration as DATABASE_URL (or POSTGRES_URL). HTTP driver — perfect
// for serverless functions.
//
// Lazily created so the app can build/import without the env var set
// (it's only required when a DB-backed route is actually hit).
let _sql: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const connectionString =
    process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!connectionString) {
    throw new Error(
      "No DATABASE_URL/POSTGRES_URL set. Add the Neon integration on Vercel " +
        "(or set it in .env.local) to enable saving recipes.",
    );
  }
  _sql = neon(connectionString);
  return _sql;
}

export interface SavedRecipe {
  id: string;
  name: string;
  bean: BeanInfo | null;
  recipe: RecipeOutput;
  /** xBloom recipe id, set once pushed; enables in-place edits. */
  xbloomId: number | null;
  shareUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

let initialized = false;

/** Create the table on first use. Idempotent. */
export async function ensureSchema(): Promise<void> {
  if (initialized) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS recipes (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      bean        JSONB,
      recipe      JSONB NOT NULL,
      xbloom_id   BIGINT,
      share_url   TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  initialized = true;
}

type Row = {
  id: string;
  name: string;
  bean: BeanInfo | null;
  recipe: RecipeOutput;
  xbloom_id: number | string | null;
  share_url: string | null;
  created_at: string;
  updated_at: string;
};

function rowToRecipe(r: Row): SavedRecipe {
  return {
    id: r.id,
    name: r.name,
    bean: r.bean,
    recipe: r.recipe,
    xbloomId: r.xbloom_id === null ? null : Number(r.xbloom_id),
    shareUrl: r.share_url,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listSavedRecipes(): Promise<SavedRecipe[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM recipes ORDER BY updated_at DESC
  `) as Row[];
  return rows.map(rowToRecipe);
}

export async function getSavedRecipe(id: string): Promise<SavedRecipe | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM recipes WHERE id = ${id}
  `) as Row[];
  return rows[0] ? rowToRecipe(rows[0]) : null;
}

export async function createSavedRecipe(input: {
  name: string;
  bean: BeanInfo | null;
  recipe: RecipeOutput;
  xbloomId?: number | null;
  shareUrl?: string | null;
}): Promise<SavedRecipe> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO recipes (name, bean, recipe, xbloom_id, share_url)
    VALUES (
      ${input.name},
      ${input.bean ? JSON.stringify(input.bean) : null},
      ${JSON.stringify(input.recipe)},
      ${input.xbloomId ?? null},
      ${input.shareUrl ?? null}
    )
    RETURNING *
  `) as Row[];
  return rowToRecipe(rows[0]);
}

export async function updateSavedRecipe(
  id: string,
  input: {
    name?: string;
    bean?: BeanInfo | null;
    recipe?: RecipeOutput;
    xbloomId?: number | null;
    shareUrl?: string | null;
  },
): Promise<SavedRecipe | null> {
  await ensureSchema();
  const existing = await getSavedRecipe(id);
  if (!existing) return null;

  const name = input.name ?? existing.name;
  const bean = input.bean !== undefined ? input.bean : existing.bean;
  const recipe = input.recipe ?? existing.recipe;
  const xbloomId =
    input.xbloomId !== undefined ? input.xbloomId : existing.xbloomId;
  const shareUrl =
    input.shareUrl !== undefined ? input.shareUrl : existing.shareUrl;

  const sql = getSql();
  const rows = (await sql`
    UPDATE recipes SET
      name      = ${name},
      bean      = ${bean ? JSON.stringify(bean) : null},
      recipe    = ${JSON.stringify(recipe)},
      xbloom_id = ${xbloomId ?? null},
      share_url = ${shareUrl ?? null},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `) as Row[];
  return rows[0] ? rowToRecipe(rows[0]) : null;
}

export async function deleteSavedRecipe(id: string): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM recipes WHERE id = ${id} RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}
