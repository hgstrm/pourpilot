import { NextResponse } from "next/server";
import { getAuthSession } from "./auth";

export async function requireUser() {
  const session = await getAuthSession();
  return session?.user ?? null;
}

export async function requireApiUser() {
  const user = await requireUser();
  if (user) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
