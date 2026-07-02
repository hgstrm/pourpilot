"use client";

import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, Loader2, Mail, ServerCog } from "lucide-react";
import type {
  RuntimeSettingKey,
  RuntimeSettingStatus,
} from "@/lib/runtime-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Values = Record<RuntimeSettingKey, string>;

const EMPTY_VALUES: Values = {
  aiGatewayApiKey: "",
  xbloomEmail: "",
  xbloomPassword: "",
};

const ICONS = {
  aiGatewayApiKey: KeyRound,
  xbloomEmail: Mail,
  xbloomPassword: KeyRound,
} satisfies Record<RuntimeSettingKey, typeof KeyRound>;

export function SettingsForm({
  initialSettings,
}: {
  initialSettings: RuntimeSettingStatus[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(
    () =>
      settings.some(
        (setting) =>
          setting.source !== "env" && values[setting.key].trim().length > 0,
      ),
    [settings, values],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const body = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value.trim()),
      );
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save settings.");
      setSettings(data.settings);
      setValues(EMPTY_VALUES);
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="rounded-xl border bg-secondary/35 p-3 text-sm text-muted-foreground">
        <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
          <ServerCog className="size-4 text-primary" />
          Runtime settings
        </div>
        Environment variables still take priority. Values saved here are stored
        server-side in this instance&apos;s database. The assistant runtime still
        uses deployment env or Vercel OIDC for its own model calls.
      </div>

      {settings.map((setting) => {
        const Icon = ICONS[setting.key];
        const envManaged = setting.source === "env";
        const configured = setting.configured;
        return (
          <Card key={setting.key} className="gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold tracking-[0]">{setting.label}</h2>
                    <Badge variant={configured ? "accent" : "secondary"}>
                      {configured ? setting.source : "missing"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
              </div>
              {configured && (
                <CheckCircle2 className="mt-2 size-5 shrink-0 text-accent" />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor={setting.key}>{setting.envName}</Label>
              <Input
                id={setting.key}
                type={setting.secret ? "password" : "text"}
                inputMode={setting.key === "xbloomEmail" ? "email" : "text"}
                autoComplete="off"
                disabled={envManaged || saving}
                placeholder={
                  envManaged
                    ? "Managed by deployment env"
                    : setting.displayValue
                      ? `Current: ${setting.displayValue}`
                      : `Add ${setting.envName}`
                }
                value={values[setting.key]}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [setting.key]: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {envManaged
                  ? "Set on the host, so this app will not override it."
                  : `Used for ${setting.requiredFor.toLowerCase()}.`}
              </p>
            </div>
          </Card>
        );
      })}

      <Button type="submit" disabled={!canSave || saving} className="mt-1">
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Save settings
      </Button>
    </form>
  );
}
