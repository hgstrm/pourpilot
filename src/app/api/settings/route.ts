import { NextRequest, NextResponse } from "next/server";
import { safeError } from "@/lib/api-error";
import { requireApiUser } from "@/lib/auth-guard";
import {
  listRuntimeSettingStatuses,
  runtimeSettingsUpdateSchema,
  updateRuntimeSettings,
} from "@/lib/runtime-settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const unauthorized = await requireApiUser();
    if (unauthorized) return unauthorized;

    return NextResponse.json({
      settings: await listRuntimeSettingStatuses(),
    });
  } catch (err) {
    return safeError("settings:get", err, 500, "Couldn't load settings.");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const unauthorized = await requireApiUser();
    if (unauthorized) return unauthorized;

    const parsed = runtimeSettingsUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
    }

    await updateRuntimeSettings(parsed.data);
    return NextResponse.json({
      settings: await listRuntimeSettingStatuses(),
    });
  } catch (err) {
    return safeError("settings:update", err, 400, "Couldn't save settings.");
  }
}
