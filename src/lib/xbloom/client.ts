// xBloom cloud API client.
//
// Ported & cleaned from the reverse-engineered xBloom private API
// (credit: github.com/denull0/xbloom-agent). All recipe-mutating endpoints
// require an RSA-encrypted JSON body using xBloom's hardcoded public key.
//
// Flow:
//   1. login(email, password)  -> { memberId, token }
//   2. createRecipe(creds, recipe) -> recipe syncs to the xBloom iOS app
//
// Runs server-side only (uses node:crypto).

import { Buffer } from "node:buffer";
import { publicEncrypt, constants } from "node:crypto";
import type {
  CoffeeRecipe,
  Pour,
  PourPattern,
  XbloomApiResult,
  XbloomCredentials,
} from "./types";

const API_BASE = "https://client-api.xbloom.com";
const SHARE_BASE = "https://share-h5.xbloom.com";

// xBloom's public RSA key (from the app). Used to encrypt request bodies.
const RSA_PUBLIC_KEY_B64 =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4LF40GZ72SdhMyl765K/i4nY5" +
  "CPcHz2Q1IKWKZ9S79xmK7G8pUhbVf4EZLvnNF1+9IvOFQUKV5Z7ZNNviqSpnql9" +
  "tAT+8+J/He0R7pcirvVSxgdr2i9V/C/gmqAEZ5qVTzRnd3uWdFoKzPdEBxP0Ipor" +
  "J1VBbCv90yBSOhVxO+QIDAQAB";

const RSA_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----\n${RSA_PUBLIC_KEY_B64.match(/.{1,64}/g)!.join("\n")}\n-----END PUBLIC KEY-----`;

const API_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Referer: `${SHARE_BASE}/`,
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
};

const PATTERN_MAP: Record<PourPattern, number> = {
  centered: 1,
  spiral: 2,
  circular: 3,
};

/**
 * RSA-encrypt a JSON payload the way the xBloom API expects:
 * PKCS1 v1.5 padding, 117-byte plaintext chunks, concatenated, base64.
 */
function rsaEncrypt(payload: Record<string, unknown>): string {
  const plaintext = Buffer.from(JSON.stringify(payload), "utf-8");
  const chunkSize = 117;
  const chunks: Buffer[] = [];
  for (let i = 0; i < plaintext.length; i += chunkSize) {
    const chunk = plaintext.subarray(i, i + chunkSize);
    chunks.push(
      publicEncrypt(
        { key: RSA_PUBLIC_KEY_PEM, padding: constants.RSA_PKCS1_PADDING },
        chunk,
      ),
    );
  }
  return Buffer.concat(chunks).toString("base64");
}

async function postPlain(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<XbloomApiResult> {
  const resp = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify(payload),
  });
  return (await resp.json()) as XbloomApiResult;
}

async function postEncrypted(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<XbloomApiResult> {
  const resp = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify(rsaEncrypt(payload)),
  });
  return (await resp.json()) as XbloomApiResult;
}

function authBase(creds: XbloomCredentials): Record<string, unknown> {
  return {
    interfaceVersion: 20240918,
    skey: "testskey",
    phoneType: "Android",
    memberId: creds.memberId,
    clientType: 2,
    languageType: 1,
    token: creds.token,
  };
}

function buildPourList(pours: Pour[]) {
  return pours.map((p, i) => ({
    theName: i === 0 ? "Bloom" : `Pour ${i + 1}`,
    volume: Number(p.volumeMl),
    temperature: Number(p.temperatureC),
    flowRate: Number(p.flowRate),
    pattern: PATTERN_MAP[p.pattern] ?? 2,
    pausing: Number(p.pauseSeconds),
    isEnableVibrationBefore: p.agitateBefore ? 1 : 2,
    isEnableVibrationAfter: p.agitateAfter ? 1 : 2,
  }));
}

export class XbloomError extends Error {}

/** Authenticate with an xBloom account. Returns credentials for later calls. */
export async function login(
  email: string,
  password: string,
): Promise<XbloomCredentials> {
  const resp = await postPlain("tMemberLogin.thtml", {
    interfaceVersion: 20240918,
    skey: "testskey",
    clientType: 2,
    phoneType: "Android",
    languageType: 1,
    email,
    password,
  });

  if (resp.result !== "success") {
    throw new XbloomError("xBloom login failed: check email/password");
  }

  const member = resp.member as Record<string, unknown>;
  return {
    memberId: member.tableId as number,
    token: resp.token as string,
    email,
  };
}

export interface CreateRecipeResult {
  recipeId: number;
  shareUrl: string;
}

/** Push a new coffee recipe; it appears in the xBloom app immediately. */
export async function createRecipe(
  creds: XbloomCredentials,
  recipe: CoffeeRecipe,
): Promise<CreateRecipeResult> {
  const payload = {
    ...authBase(creds),
    theName: recipe.name,
    dose: Number(recipe.doseG),
    grandWater: Number(recipe.ratio),
    grinderSize: Number(recipe.grindSize),
    rpm: Number(recipe.grindRpm),
    cupType: 2,
    adaptedModel: 1,
    isEnableBypassWater: 2,
    isSetGrinderSize: 1,
    theColor: recipe.color || "#C9D5B8",
    theSubsetId: 0,
    bypassTemp: 85.0,
    bypassVolume: 5.0,
    subSetType: 2,
    appPlace: [4],
    createTimeStamp: Date.now(),
    isShortcuts: 2,
    pourDataJSONStr: JSON.stringify(buildPourList(recipe.pours)),
  };

  const resp = await postEncrypted("tuRecipeAdd.tuhtml", payload);
  if (resp.result !== "success") {
    throw new XbloomError(
      `Failed to create recipe: ${resp.error ?? JSON.stringify(resp)}`,
    );
  }

  const recipeId = resp.tableId as number;
  const shareId = Buffer.from(String(recipeId)).toString("base64");
  return {
    recipeId,
    shareUrl: `${SHARE_BASE}/?id=${encodeURIComponent(shareId)}`,
  };
}

export interface RecipeSummary {
  id: number;
  name: string;
  doseG: number;
  ratio: number;
  grindSize: number;
  rpm: number;
  shareUrl?: string;
}

/** List recipes on the account (useful to verify a push landed). */
export async function listRecipes(
  creds: XbloomCredentials,
): Promise<RecipeSummary[]> {
  const resp = await postEncrypted("tuMyTeaRecipeCreated.tuhtml", {
    ...authBase(creds),
    pageNumber: 1,
    countPerPage: 100,
    adaptedModel: 1,
  });
  if (resp.result !== "success") {
    throw new XbloomError("Failed to list recipes (session may be expired)");
  }
  const list = (resp.list as Record<string, unknown>[]) || [];
  return list.map((r) => ({
    id: r.tableId as number,
    name: r.theName as string,
    doseG: r.dose as number,
    ratio: r.grandWater as number,
    grindSize: r.grinderSize as number,
    rpm: r.rpm as number,
    shareUrl: r.shareRecipeLink as string | undefined,
  }));
}

export interface RecipeFull extends RecipeSummary {
  pours: Pour[];
}

const PATTERN_REV: Record<number, PourPattern> = {
  1: "centered",
  2: "spiral",
  3: "circular",
};

/** List recipes WITH full pour data — used to import them into this app. */
export async function listRecipesFull(
  creds: XbloomCredentials,
): Promise<RecipeFull[]> {
  const resp = await postEncrypted("tuMyTeaRecipeCreated.tuhtml", {
    ...authBase(creds),
    pageNumber: 1,
    countPerPage: 100,
    adaptedModel: 1,
  });
  if (resp.result !== "success") {
    throw new XbloomError("Failed to list recipes (session may be expired)");
  }
  const list = (resp.list as Record<string, unknown>[]) || [];
  return list.map((r) => {
    const rawPours = (r.pourList as Record<string, unknown>[]) || [];
    const pours: Pour[] = rawPours.map((p) => ({
      volumeMl: Number(p.volume ?? 30),
      temperatureC: Number(p.temperature ?? 93),
      pattern: PATTERN_REV[Number(p.pattern ?? 2)] ?? "spiral",
      flowRate: Number(p.flowRate ?? 3.2),
      pauseSeconds: Number(p.pausing ?? 0),
      agitateBefore: Number(p.isEnableVibrationBefore) === 1,
      agitateAfter: Number(p.isEnableVibrationAfter) === 1,
    }));
    return {
      id: r.tableId as number,
      name: r.theName as string,
      doseG: r.dose as number,
      ratio: r.grandWater as number,
      grindSize: r.grinderSize as number,
      rpm: r.rpm as number,
      shareUrl: r.shareRecipeLink as string | undefined,
      pours,
    };
  });
}

/**
 * Update an existing recipe in place (re-push edits to the machine/app).
 * Pass the full recipe; the xBloom id of the recipe to overwrite is `recipeId`.
 */
export async function editRecipe(
  creds: XbloomCredentials,
  recipeId: number,
  recipe: CoffeeRecipe,
): Promise<void> {
  const payload = {
    ...authBase(creds),
    tableId: recipeId,
    theName: recipe.name,
    dose: Number(recipe.doseG),
    grandWater: Number(recipe.ratio),
    grinderSize: Number(recipe.grindSize),
    rpm: Number(recipe.grindRpm),
    cupType: 2,
    adaptedModel: 1,
    isEnableBypassWater: 2,
    isSetGrinderSize: 1,
    theColor: recipe.color || "#C9D5B8",
    theSubsetId: 0,
    bypassTemp: 85.0,
    bypassVolume: 5.0,
    subSetType: 2,
    appPlace: [4],
    isShortcuts: 2,
    pourDataJSONStr: JSON.stringify(buildPourList(recipe.pours)),
  };
  const resp = await postEncrypted("tuRecipeUpdate.tuhtml", payload);
  if (resp.result !== "success") {
    throw new XbloomError(
      `Failed to update recipe: ${resp.error ?? JSON.stringify(resp)}`,
    );
  }
}

/** Delete a recipe by id (handy for cleaning up test pushes). */
export async function deleteRecipe(
  creds: XbloomCredentials,
  recipeId: number,
): Promise<void> {
  const resp = await postEncrypted("tuRecipeDelete.tuhtml", {
    ...authBase(creds),
    tableId: recipeId,
  });
  if (resp.result !== "success") {
    throw new XbloomError("Failed to delete recipe");
  }
}
