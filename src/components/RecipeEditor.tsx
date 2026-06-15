"use client";

import type { RecipeOutput } from "@/lib/recipe-schema";
import { PATTERNS, totalWater, targetWater } from "@/lib/client-types";

type Pour = RecipeOutput["pours"][number];

export function RecipeEditor({
  recipe,
  onChange,
}: {
  recipe: RecipeOutput;
  onChange: (next: RecipeOutput) => void;
}) {
  function set<K extends keyof RecipeOutput>(key: K, value: RecipeOutput[K]) {
    onChange({ ...recipe, [key]: value });
  }

  function setPour(i: number, patch: Partial<Pour>) {
    const pours = recipe.pours.map((p, idx) =>
      idx === i ? { ...p, ...patch } : p,
    );
    onChange({ ...recipe, pours });
  }

  function addPour() {
    const last = recipe.pours[recipe.pours.length - 1];
    onChange({
      ...recipe,
      pours: [
        ...recipe.pours,
        {
          volumeMl: 50,
          temperatureC: last?.temperatureC ?? 93,
          pattern: "spiral",
          flowRate: 3.2,
          pauseSeconds: 0,
          agitateBefore: false,
          agitateAfter: false,
        },
      ],
    });
  }

  function removePour(i: number) {
    onChange({ ...recipe, pours: recipe.pours.filter((_, idx) => idx !== i) });
  }

  const total = totalWater(recipe);
  const target = targetWater(recipe);
  const off = Math.abs(total - target) > 5;

  return (
    <div>
      <div className="card">
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Recipe name</label>
          <input
            value={recipe.name}
            maxLength={40}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div className="grid">
          <NumberField
            label="Dose (g)"
            value={recipe.doseG}
            min={5}
            max={31}
            step={0.5}
            onChange={(v) => set("doseG", v)}
          />
          <NumberField
            label="Ratio (1:x)"
            value={recipe.ratio}
            min={12}
            max={20}
            step={0.5}
            onChange={(v) => set("ratio", v)}
          />
          <NumberField
            label="Grind (40–120)"
            value={recipe.grindSize}
            min={40}
            max={120}
            step={1}
            onChange={(v) => set("grindSize", Math.round(v))}
          />
          <NumberField
            label="RPM (60–120)"
            value={recipe.grindRpm}
            min={60}
            max={120}
            step={10}
            onChange={(v) => set("grindRpm", Math.round(v))}
          />
        </div>

        <p className={off ? "total warn" : "total"}>
          Total water: {total}ml &middot; target {target}ml
          {off ? " — pours don't sum to dose × ratio" : " ✓"}
        </p>
      </div>

      <p className="section-title">Pours ({recipe.pours.length})</p>

      {recipe.pours.map((p, i) => (
        <div className="pour" key={i}>
          <div className="pour-head">
            <span className="name">{i === 0 ? "Bloom" : `Pour ${i + 1}`}</span>
            {recipe.pours.length > 1 && (
              <button
                className="btn-danger"
                style={{ minHeight: 40, padding: "0 14px" }}
                onClick={() => removePour(i)}
              >
                Remove
              </button>
            )}
          </div>

          <div className="pour-grid">
            <NumberField
              label="Water (ml)"
              value={p.volumeMl}
              min={5}
              max={500}
              step={5}
              onChange={(v) => setPour(i, { volumeMl: v })}
            />
            <NumberField
              label="Temp (°C)"
              value={p.temperatureC}
              min={40}
              max={99}
              step={1}
              onChange={(v) => setPour(i, { temperatureC: v })}
            />
            <div className="field">
              <label>Pattern</label>
              <select
                value={p.pattern}
                onChange={(e) =>
                  setPour(i, { pattern: e.target.value as Pour["pattern"] })
                }
              >
                {PATTERNS.map((pat) => (
                  <option key={pat} value={pat}>
                    {pat}
                  </option>
                ))}
              </select>
            </div>
            <NumberField
              label="Flow (ml/s)"
              value={p.flowRate}
              min={3.0}
              max={3.5}
              step={0.1}
              onChange={(v) => setPour(i, { flowRate: v })}
            />
            <NumberField
              label="Pause after (s)"
              value={p.pauseSeconds}
              min={0}
              max={255}
              step={5}
              onChange={(v) => setPour(i, { pauseSeconds: Math.round(v) })}
            />
          </div>

          <div className="checks">
            <label>
              <input
                type="checkbox"
                checked={p.agitateBefore}
                onChange={(e) => setPour(i, { agitateBefore: e.target.checked })}
              />
              Agitate before
            </label>
            <label>
              <input
                type="checkbox"
                checked={p.agitateAfter}
                onChange={(e) => setPour(i, { agitateAfter: e.target.checked })}
              />
              Agitate after
            </label>
          </div>
        </div>
      ))}

      {recipe.pours.length < 6 && (
        <button
          className="btn-ghost"
          style={{ width: "100%", marginBottom: 8 }}
          onClick={addPour}
        >
          + Add pour
        </button>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
      />
    </div>
  );
}
