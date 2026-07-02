import { z } from "zod";
import { getSql } from "./db";

export class RuntimeSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeSettingsError";
  }
}

export const runtimeSettingKeys = [
  "aiGatewayApiKey",
  "xbloomEmail",
  "xbloomPassword",
] as const;

export type RuntimeSettingKey = (typeof runtimeSettingKeys)[number];
export type RuntimeSettingSource = "env" | "database" | "missing";

type SettingDef = {
  dbKey: string;
  envName: string;
  label: string;
  description: string;
  secret: boolean;
  requiredFor: string;
};

const SETTING_DEFS: Record<RuntimeSettingKey, SettingDef> = {
  aiGatewayApiKey: {
    dbKey: "ai_gateway_api_key",
    envName: "AI_GATEWAY_API_KEY",
    label: "AI Gateway key",
    description: "Used to build and adjust recipes.",
    secret: true,
    requiredFor: "Recipe building",
  },
  xbloomEmail: {
    dbKey: "xbloom_email",
    envName: "XBLOOM_EMAIL",
    label: "xBloom email",
    description: "Used to import and sync recipes with xBloom.",
    secret: false,
    requiredFor: "xBloom sync",
  },
  xbloomPassword: {
    dbKey: "xbloom_password",
    envName: "XBLOOM_PASSWORD",
    label: "xBloom password",
    description: "Used to import and sync recipes with xBloom.",
    secret: true,
    requiredFor: "xBloom sync",
  },
};

export type RuntimeSettingStatus = {
  key: RuntimeSettingKey;
  envName: string;
  label: string;
  description: string;
  secret: boolean;
  requiredFor: string;
  configured: boolean;
  source: RuntimeSettingSource;
  displayValue: string | null;
};

export const runtimeSettingsUpdateSchema = z.object({
  aiGatewayApiKey: z.string().optional(),
  xbloomEmail: z.string().optional(),
  xbloomPassword: z.string().optional(),
});

export type RuntimeSettingsUpdate = z.infer<typeof runtimeSettingsUpdateSchema>;

let settingsInitialized = false;

async function ensureSettingsSchema(): Promise<void> {
  if (settingsInitialized) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  settingsInitialized = true;
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function envValue(key: RuntimeSettingKey): string | null {
  const def = SETTING_DEFS[key];
  return clean(process.env[def.envName]);
}

function hasGatewayEnvAuth(): boolean {
  return Boolean(envValue("aiGatewayApiKey") || clean(process.env.VERCEL_OIDC_TOKEN));
}

async function dbValue(key: RuntimeSettingKey): Promise<string | null> {
  await ensureSettingsSchema();
  const sql = getSql();
  const def = SETTING_DEFS[key];
  const rows = (await sql`
    SELECT value FROM app_settings WHERE key = ${def.dbKey}
  `) as { value: string }[];
  return clean(rows[0]?.value);
}

async function effectiveValue(key: RuntimeSettingKey): Promise<string | null> {
  return envValue(key) ?? (await dbValue(key));
}

export async function getAiGatewayApiKey(): Promise<string | null> {
  const apiKey = envValue("aiGatewayApiKey");
  if (apiKey) return apiKey;
  if (clean(process.env.VERCEL_OIDC_TOKEN)) return null;
  return dbValue("aiGatewayApiKey");
}

export function hasAiGatewayEnvironmentAuth(): boolean {
  return hasGatewayEnvAuth();
}

export async function getXbloomCredentials(): Promise<{
  email: string;
  password: string;
}> {
  const email = await effectiveValue("xbloomEmail");
  const password = await effectiveValue("xbloomPassword");
  if (!email || !password) {
    throw new RuntimeSettingsError(
      "Add your xBloom email and password in Settings before syncing recipes.",
    );
  }
  return { email, password };
}

export async function updateRuntimeSettings(
  input: RuntimeSettingsUpdate,
): Promise<void> {
  const parsed = runtimeSettingsUpdateSchema.parse(input);
  const email = clean(parsed.xbloomEmail);
  if (email && !z.string().email().safeParse(email).success) {
    throw new RuntimeSettingsError("Enter a valid xBloom email address.");
  }

  await ensureSettingsSchema();
  const sql = getSql();

  for (const key of runtimeSettingKeys) {
    const value = clean(parsed[key]);
    if (!value) continue;
    const def = SETTING_DEFS[key];
    await sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (${def.dbKey}, ${value}, now())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
  }
}

export async function listRuntimeSettingStatuses(): Promise<
  RuntimeSettingStatus[]
> {
  await ensureSettingsSchema();
  const values = await Promise.all(
    runtimeSettingKeys.map(async (key) => {
      const def = SETTING_DEFS[key];
      const env = envValue(key);
      const db = await dbValue(key);
      const configuredByOidc =
        key === "aiGatewayApiKey" && !env && clean(process.env.VERCEL_OIDC_TOKEN);
      const source: RuntimeSettingSource = env
        ? "env"
        : db
          ? "database"
          : configuredByOidc
            ? "env"
            : "missing";
      const value = env ?? db ?? null;
      return {
        key,
        envName:
          key === "aiGatewayApiKey" && configuredByOidc
            ? "VERCEL_OIDC_TOKEN"
            : def.envName,
        label: def.label,
        description: def.description,
        secret: def.secret,
        requiredFor: def.requiredFor,
        configured: source !== "missing",
        source,
        displayValue: value ? displayValue(value, def.secret) : null,
      };
    }),
  );
  return values;
}

export async function missingRuntimeSettings(): Promise<RuntimeSettingStatus[]> {
  const settings = await listRuntimeSettingStatuses();
  return settings.filter((setting) => !setting.configured);
}

export async function assertAiGatewayConfigured(): Promise<void> {
  if (await getAiGatewayApiKey()) return;
  if (hasGatewayEnvAuth()) return;
  throw new RuntimeSettingsError(
    "Add an AI Gateway key in Settings before building recipes.",
  );
}

function displayValue(value: string, secret: boolean): string {
  if (!secret) return value;
  const tail = value.slice(-4);
  return tail ? `••••${tail}` : "••••";
}
