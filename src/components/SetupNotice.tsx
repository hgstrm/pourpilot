"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, ServerCog } from "lucide-react";
import type { RuntimeSettingStatus } from "@/lib/runtime-settings";
import { Button } from "@/components/ui/button";

export function SetupNotice() {
  const [missing, setMissing] = useState<RuntimeSettingStatus[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.settings) return;
        setMissing(
          data.settings.filter((setting: RuntimeSettingStatus) => !setting.configured),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (missing.length === 0) return null;

  const names = missing.map((setting) => setting.label).join(", ");

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/10 p-3.5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-sm">
          <ServerCog className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="size-4 text-primary" />
            Setup needed
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add {names} to unlock the full workflow.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/settings">
            Settings <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
