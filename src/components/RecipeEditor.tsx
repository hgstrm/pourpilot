"use client";

import type { RecipeOutput } from "@/lib/recipe-schema";
import { PATTERNS, totalWater, targetWater } from "@/lib/client-types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Plus, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-2">
          <Label htmlFor="recipe-name">Recipe name</Label>
          <Input
            id="recipe-name"
            value={recipe.name}
            maxLength={40}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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

        <p
          className={cn(
            "flex items-center gap-1.5 text-sm",
            off ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {off ? (
            <TriangleAlert className="size-4" />
          ) : (
            <Check className="size-4 text-accent" />
          )}
          Total water {total}ml · target {target}ml
          {off && " — pours don't sum to dose × ratio"}
        </p>
      </Card>

      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Pours ({recipe.pours.length})
      </p>

      {recipe.pours.map((p, i) => (
        <Card key={i} className="gap-3 bg-secondary/40 p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-primary">
              {i === 0 ? "Bloom" : `Pour ${i + 1}`}
            </span>
            {recipe.pours.length > 1 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removePour(i)}
              >
                <Trash2 className="size-4" /> Remove
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="flex flex-col gap-2">
              <Label>Pattern</Label>
              <Select
                value={p.pattern}
                onValueChange={(v) =>
                  setPour(i, { pattern: v as Pour["pattern"] })
                }
              >
                <SelectTrigger className="capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PATTERNS.map((pat) => (
                    <SelectItem key={pat} value={pat} className="capitalize">
                      {pat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="flex gap-5 pt-1">
            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Checkbox
                checked={p.agitateBefore}
                onCheckedChange={(c) =>
                  setPour(i, { agitateBefore: c === true })
                }
              />
              Agitate before
            </label>
            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Checkbox
                checked={p.agitateAfter}
                onCheckedChange={(c) =>
                  setPour(i, { agitateAfter: c === true })
                }
              />
              Agitate after
            </label>
          </div>
        </Card>
      ))}

      {recipe.pours.length < 6 && (
        <Button variant="outline" className="w-full" onClick={addPour}>
          <Plus className="size-4" /> Add pour
        </Button>
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
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Input
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
