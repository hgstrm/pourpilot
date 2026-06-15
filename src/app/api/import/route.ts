import { NextRequest, NextResponse } from "next/server";
import { login, listRecipesFull } from "@/lib/xbloom/client";
import { createSavedRecipe } from "@/lib/db";
import type { RecipeOutput } from "@/lib/recipe-schema";
import { safeError } from "@/lib/api-error";
import { z } from "zod";

export const runtime = "nodejs";

function creds() {
  const email = process.env.XBLOOM_EMAIL;
  const password = process.env.XBLOOM_PASSWORD;
  if (!email || !password) throw new Error("Missing XBLOOM_EMAIL / XBLOOM_PASSWORD");
  return { email, password };
}

// GET /api/import -> list recipes currently on the xBloom account.
export async function GET() {
  try {
    const { email, password } = creds();
    const session = await login(email, password);
    const recipes = await listRecipesFull(session);
    return NextResponse.json({ recipes });
  } catch (err) {
    return safeError("import:list", err, 500, "Couldn't list your xBloom recipes.");
  }
}

const importBody = z.object({ xbloomId: z.number() });

// POST /api/import { xbloomId } -> copy that xBloom recipe into our DB.
export async function POST(req: NextRequest) {
  try {
    const parsed = importBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { email, password } = creds();
    const session = await login(email, password);
    const all = await listRecipesFull(session);
    const found = all.find((r) => r.id === parsed.data.xbloomId);
    if (!found) {
      return NextResponse.json({ error: "Recipe not found on xBloom" }, { status: 404 });
    }

    const clamp = (v: number, lo: number, hi: number) =>
      Math.min(hi, Math.max(lo, Math.round(v)));

    const recipe: RecipeOutput = {
      name: found.name.slice(0, 40),
      doseG: clamp(found.doseG, 5, 31),
      ratio: Math.min(20, Math.max(12, found.ratio)),
      grindSize: clamp(found.grindSize, 40, 120),
      grindRpm: clamp(found.rpm, 60, 120),
      pours: found.pours.map((p) => ({
        ...p,
        flowRate: Math.min(3.5, Math.max(3.0, p.flowRate)),
        pauseSeconds: clamp(p.pauseSeconds, 0, 255),
      })),
      reasoning: "Imported from your xBloom account.",
    };

    const saved = await createSavedRecipe({
      name: found.name,
      bean: null,
      recipe,
      xbloomId: found.id,
      shareUrl: found.shareUrl ?? null,
    });

    return NextResponse.json({ recipe: saved });
  } catch (err) {
    return safeError("import:create", err, 500, "Couldn't import that recipe.");
  }
}
