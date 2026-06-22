"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Calculator, ChevronLeft, Coffee, Scale, Snowflake } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RATIO_PRESETS = [
  { label: "Bold", value: 10 },
  { label: "Hario", value: 12.5 },
  { label: "Light", value: 15 },
] as const;

const DEFAULT_BATCH_MAX_G = 30;

export default function ColdBrewPage() {
  const [volumeMl, setVolumeMl] = useState(1000);
  const [ratio, setRatio] = useState(12.5);
  const [batchMaxG, setBatchMaxG] = useState(DEFAULT_BATCH_MAX_G);

  const result = useMemo(() => {
    const safeVolume = clamp(volumeMl, 100, 2000);
    const safeRatio = clamp(ratio, 6, 20);
    const safeBatchMax = clamp(batchMaxG, 5, DEFAULT_BATCH_MAX_G);
    const coffeeG = safeVolume / safeRatio;
    const batches = Math.max(1, Math.ceil(coffeeG / safeBatchMax));
    const evenBatchG = coffeeG / batches;
    const batchPlan = Array.from({ length: batches }, (_, i) => {
      if (i < batches - 1) return Math.ceil(evenBatchG);
      const previous = Math.ceil(evenBatchG) * (batches - 1);
      return Math.max(0, Math.round(coffeeG - previous));
    });

    return {
      coffeeG,
      batches,
      batchPlan,
      strengthLabel:
        safeRatio <= 10.5 ? "bold" : safeRatio >= 14 ? "lighter" : "balanced",
    };
  }, [batchMaxG, ratio, volumeMl]);

  return (
    <main className="app-wrap">
      <header className="mb-5 flex items-center justify-between">
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/">
            <ChevronLeft className="size-4" /> Back
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/recipes">Saved</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-lg bg-primary/15 text-primary">
            <Snowflake className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Cold brew calculator
            </h1>
            <p className="text-sm text-muted-foreground">
              Hario-style batches, xBloom grind splits.
            </p>
          </div>
        </div>

        <Card>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              id="pitcher-ml"
              label="Pitcher (ml)"
              value={volumeMl}
              min={100}
              max={2000}
              step={50}
              onChange={setVolumeMl}
            />
            <NumberField
              id="cold-brew-ratio"
              label="Ratio (1:x)"
              value={ratio}
              min={6}
              max={20}
              step={0.5}
              onChange={setRatio}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-xs text-muted-foreground">
              Strength
            </span>
            {RATIO_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant={ratio === preset.value ? "default" : "secondary"}
                size="sm"
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setRatio(preset.value)}
              >
                {preset.label} 1:{preset.value}
              </Button>
            ))}
          </div>

          <NumberField
            id="grind-batch-max"
            label="Max per grind (g)"
            value={batchMaxG}
            min={5}
            max={DEFAULT_BATCH_MAX_G}
            step={1}
            onChange={setBatchMaxG}
          />
        </Card>

        <Card className="gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric
              icon={<Coffee className="size-4" />}
              label="Coffee"
              value={`${formatGram(result.coffeeG)}g`}
            />
            <Metric
              icon={<Scale className="size-4" />}
              label="Water"
              value={`${Math.round(volumeMl)}ml`}
            />
          </div>

          <div className="rounded-lg border bg-secondary/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">xBloom grind plan</span>
              <Badge variant="accent">
                <Calculator className="size-3" />
                {result.batches} {result.batches === 1 ? "batch" : "batches"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.batchPlan.map((grams, i) => (
                <Badge key={i} variant="secondary">
                  {i + 1}: {grams}g
                </Badge>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {Math.round(volumeMl)}ml at 1:{ratio} makes a {result.strengthLabel}{" "}
            Mizudashi-style brew. Grind coarser for a lighter cup, or a touch
            finer for more body.
          </p>
        </Card>

        <Card className="gap-2 border-primary/20 bg-primary/5">
          <p className="text-sm font-semibold">xBloom note</p>
          <p className="text-sm text-muted-foreground">
            The Studio dosing cup is listed at 30g. I could not find an
            official continuous-grinding duty cycle, so large cold-brew batches
            are split into 30g-or-smaller runs.
          </p>
        </Card>
      </div>
    </main>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = parseFloat(e.target.value);
          if (!Number.isNaN(next)) onChange(next);
        }}
      />
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-secondary/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatGram(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
