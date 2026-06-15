"use client";

import { useState } from "react";
import type { RecipeOutput, BeanInfo } from "@/lib/recipe-schema";
import { FEEDBACK_PRESETS } from "@/lib/adjust";
import { haptics } from "@/lib/haptics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";

export function AdjustBar({
  recipe,
  bean,
  onAdjusted,
  onError,
}: {
  recipe: RecipeOutput;
  bean?: BeanInfo | null;
  onAdjusted: (next: RecipeOutput, note: string) => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  async function adjust(feedback: string, key: string) {
    setBusy(key);
    haptics.light();
    try {
      const res = await fetch("/api/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe, bean, feedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adjust failed");
      haptics.success();
      onAdjusted(data.recipe, data.recipe.changeNote ?? "Recipe adjusted.");
    } catch (e) {
      haptics.warn();
      onError(e instanceof Error ? e.message : "Adjust failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="gap-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Tune the brew
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        How did it taste? Tap to let the AI adjust, then re-push.
      </p>

      <div className="flex flex-wrap gap-2">
        {FEEDBACK_PRESETS.map((p) => (
          <Button
            key={p.key}
            variant="secondary"
            size="sm"
            className="rounded-full"
            disabled={busy !== null}
            onClick={() => adjust(p.feedback, p.key)}
          >
            {busy === p.key && <Loader2 className="size-4 animate-spin" />}
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex gap-2.5">
        <Input
          placeholder="Or describe it… e.g. 'a bit muddy, want cleaner'"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim() && !busy) {
              adjust(custom.trim(), "custom");
            }
          }}
        />
        <Button
          variant="outline"
          disabled={!custom.trim() || busy !== null}
          onClick={() => adjust(custom.trim(), "custom")}
        >
          {busy === "custom" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Adjust"
          )}
        </Button>
      </div>
    </Card>
  );
}
