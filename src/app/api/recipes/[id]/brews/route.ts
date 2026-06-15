import { NextRequest, NextResponse } from "next/server";
import { listBrews, createBrew } from "@/lib/db";
import { recipeSchema } from "@/lib/recipe-schema";
import { z } from "zod";

export const runtime = "nodejs";

const body = z.object({
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  recipeSnapshot: recipeSchema.nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const brews = await listBrews(id);
  return NextResponse.json({ brews });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const parsed = body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid brew", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const brew = await createBrew({ recipeId: id, ...parsed.data });
    return NextResponse.json({ brew });
  } catch (err) {
    console.error("[brews:create] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to log brew" },
      { status: 500 },
    );
  }
}
