"use client";

import type { RecipeOutput } from "@/lib/recipe-schema";
import { targetWater } from "@/lib/client-types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

type FieldDiff = { label: string; from: string; to: string };

function topDiffs(prev: RecipeOutput | null, next: RecipeOutput): FieldDiff[] {
  const out: FieldDiff[] = [];
  const cmp = (label: string, a: unknown, b: unknown) => {
    if (String(a) !== String(b))
      out.push({ label, from: String(a), to: String(b) });
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
  open,
  next,
  previous,
  isUpdate,
  busy,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  next: RecipeOutput;
  previous: RecipeOutput | null;
  isUpdate: boolean;
  busy: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const diffs = topDiffs(previous, next);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {isUpdate ? "Update on xBloom?" : "Send to xBloom?"}
          </DialogTitle>
          <DialogDescription>
            {next.doseG}g · 1:{next.ratio} · {targetWater(next)}ml · grind{" "}
            {next.grindSize} · {next.pours.length} pours
          </DialogDescription>
        </DialogHeader>

        <p className="text-lg font-bold -mt-1">{next.name}</p>

        {isUpdate && diffs.length > 0 && (
          <div className="rounded-lg border divide-y overflow-hidden text-sm">
            {diffs.map((d) => (
              <div
                key={d.label}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-3 py-2.5"
              >
                <span className="text-muted-foreground">{d.label}</span>
                <span className="text-muted-foreground line-through">
                  {d.from}
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <span className="font-bold text-primary">{d.to}</span>
              </div>
            ))}
          </div>
        )}
        {isUpdate && diffs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No top-level changes (pours may still differ).
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            className="flex-1"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isUpdate ? (
              "Update"
            ) : (
              "Send"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
