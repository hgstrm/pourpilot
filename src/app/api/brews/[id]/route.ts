import { NextRequest, NextResponse } from "next/server";
import { deleteBrew } from "@/lib/db";
import { safeError } from "@/lib/api-error";
import { requireApiUser } from "@/lib/auth-guard";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const unauthorized = await requireApiUser();
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const ok = await deleteBrew(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return safeError("brews:delete", err, 500, "Couldn't delete the brew.");
  }
}
