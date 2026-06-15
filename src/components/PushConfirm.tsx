"use client";

import type { RecipeOutput } from "@/lib/recipe-schema";
import { targetWater } from "@/lib/client-types";

// A confirm dialog that shows what will change vs what's currently on xBloom.
// `previous` is the last-pushed recipe (or null for a first push).

type FieldDiff = { label: string; from: string; to: string };

function topDiffs(prev: RecipeOutput | null, next: RecipeOutput): FieldDiff[] {
  const out: FieldDiff[] = [];
  const cmp = (label: string, a: unknown, b: unknown) => {
    if (String(a) !== String(b)) out.push({ label, from: String(a), to: String(b) });
  };
  if (!prev) return out;
  cmp("Name", prev.name, next.name);
  cmp("Dose", `${prev.doseG}g`, `${next.doseG}g`);
  cmp("Ratio", `1:${prev.ratio}`, `1:${next.ratio}`);
  cmp("Water", `${targetWater(prev)}ml`, `${targetWater(next)}ml`);
  cmp("Grind", prev.grindSize, next.grindSize);
  cmp("RPM", prev.grindRpm, next.grindRpm);
  cmp("Pours", prev.pours.length, next.pours.length);
  return out;
}

export function PushConfirm({
  next,
  previous,
  isUpdate,
  busy,
  onConfirm,
  onCancel,
}: {
  next: RecipeOutput;
  previous: RecipeOutput | null;
  isUpdate: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const diffs = topDiffs(previous, next);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <p className="section-title" style={{ marginBottom: 6 }}>
          {isUpdate ? "Update on xBloom?" : "Send to xBloom?"}
        </p>
        <p className="bean-name" style={{ fontSize: 18 }}>
          {next.name}
        </p>
        <p className="total" style={{ marginTop: 2 }}>
          {next.doseG}g · 1:{next.ratio} · {targetWater(next)}ml · grind{" "}
          {next.grindSize} · {next.pours.length} pours
        </p>

        {isUpdate && diffs.length > 0 && (
          <div className="diff">
            {diffs.map((d) => (
              <div className="diff-row" key={d.label}>
                <span className="diff-label">{d.label}</span>
                <span className="diff-from">{d.from}</span>
                <span className="diff-arrow">→</span>
                <span className="diff-to">{d.to}</span>
              </div>
            ))}
          </div>
        )}
        {isUpdate && diffs.length === 0 && (
          <p className="total">No top-level changes (pours may still differ).</p>
        )}

        <div className="row" style={{ marginTop: 18, gap: 10 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn-push" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spinner" /> : isUpdate ? "Update" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
