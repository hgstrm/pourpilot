// Vertical-slice test: prove we can log in to xBloom and push a recipe
// that lands in the iOS app. Run with: pnpm xbloom:test
//
// Requires env vars (put them in .env.local):
//   XBLOOM_EMAIL=you@example.com
//   XBLOOM_PASSWORD=...
//
// Optional:
//   XBLOOM_CLEANUP=1   delete the test recipe after verifying it pushed

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  login,
  createRecipe,
  listRecipes,
  deleteRecipe,
} from "../src/lib/xbloom/client";
import type { CoffeeRecipe } from "../src/lib/xbloom/types";

// Tiny .env.local loader (no dependency needed).
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(resolve(process.cwd(), file), "utf-8");
      for (const line of text.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !(m[1] in process.env)) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* file optional */
    }
  }
}

const SAMPLE: CoffeeRecipe = {
  name: "AI Test — Ethiopian Light",
  doseG: 15,
  ratio: 16, // 1:16 -> 240ml total
  grindSize: 70,
  grindRpm: 80,
  color: "#C9D5B8",
  pours: [
    // Bloom: ~2.5x dose, short dwell
    {
      volumeMl: 40,
      temperatureC: 94,
      pattern: "spiral",
      flowRate: 3.2,
      pauseSeconds: 35,
      agitateBefore: false,
      agitateAfter: true,
    },
    {
      volumeMl: 100,
      temperatureC: 93,
      pattern: "spiral",
      flowRate: 3.2,
      pauseSeconds: 10,
      agitateBefore: false,
      agitateAfter: false,
    },
    {
      volumeMl: 100,
      temperatureC: 92,
      pattern: "circular",
      flowRate: 3.2,
      pauseSeconds: 0,
      agitateBefore: false,
      agitateAfter: false,
    },
  ],
};

async function main() {
  loadEnv();
  const email = process.env.XBLOOM_EMAIL;
  const password = process.env.XBLOOM_PASSWORD;
  if (!email || !password) {
    console.error(
      "Missing XBLOOM_EMAIL / XBLOOM_PASSWORD. Add them to .env.local",
    );
    process.exit(1);
  }

  console.log("1) Logging in as", email, "...");
  const creds = await login(email, password);
  console.log("   ok — memberId:", creds.memberId);

  console.log("2) Pushing sample recipe:", SAMPLE.name, "...");
  const created = await createRecipe(creds, SAMPLE);
  console.log("   ok — recipeId:", created.recipeId);
  console.log("   share:", created.shareUrl);

  console.log("3) Listing recipes to confirm it landed...");
  const recipes = await listRecipes(creds);
  const found = recipes.find((r) => r.id === created.recipeId);
  if (found) {
    console.log(
      `   FOUND: [${found.id}] ${found.name} — ${found.doseG}g 1:${found.ratio} grind ${found.grindSize} rpm ${found.rpm}`,
    );
  } else {
    console.log("   WARNING: created recipe not found in list");
  }

  if (process.env.XBLOOM_CLEANUP === "1") {
    console.log("4) Cleanup: deleting test recipe...");
    await deleteRecipe(creds, created.recipeId);
    console.log("   deleted.");
  } else {
    console.log(
      "\nCheck your xBloom iOS app — the recipe should be there now.",
    );
    console.log("(Set XBLOOM_CLEANUP=1 to auto-delete the test recipe.)");
  }
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
