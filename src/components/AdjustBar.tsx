"use client";

import { useState } from "react";
import type { RecipeOutput, BeanInfo } from "@/lib/recipe-schema";
import { FEEDBACK_PRESETS } from "@/lib/adjust";
import { haptics } from "@/lib/haptics";

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
    <div className="card">
      <p className="section-title">Tune the brew</p>
      <p className="total" style={{ marginTop: 0, marginBottom: 12 }}>
        How did it taste? Tap to let the AI adjust &amp; you can re-push.
      </p>
      <div className="chips">
        {FEEDBACK_PRESETS.map((p) => (
          <button
            key={p.key}
            className="chip"
            disabled={busy !== null}
            onClick={() => adjust(p.feedback, p.key)}
          >
            {busy === p.key ? <span className="spinner" /> : null}
            {p.label}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <input
          className="chip-input"
          placeholder="Or describe it… e.g. 'a bit muddy, want cleaner'"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim() && !busy) {
              adjust(custom.trim(), "custom");
            }
          }}
        />
        <button
          className="btn-ghost"
          style={{ minWidth: 90 }}
          disabled={!custom.trim() || busy !== null}
          onClick={() => adjust(custom.trim(), "custom")}
        >
          {busy === "custom" ? <span className="spinner" /> : "Adjust"}
        </button>
      </div>
    </div>
  );
}
