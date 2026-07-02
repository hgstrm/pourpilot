import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SettingsForm } from "@/components/SettingsForm";
import { GlobalNavActions } from "@/components/GlobalNavActions";
import { Button } from "@/components/ui/button";
import { listRuntimeSettingStatuses } from "@/lib/runtime-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await listRuntimeSettingStatuses();

  return (
    <main className="app-wrap">
      <header className="mb-5 flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/">
            <ChevronLeft className="size-4" /> Back
          </Link>
        </Button>
        <GlobalNavActions current="settings" />
      </header>

      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-[0]">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add runtime credentials for this self-hosted instance.
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </main>
  );
}
