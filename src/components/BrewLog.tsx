"use client";

import { useEffect, useState } from "react";
import type { RecipeOutput } from "@/lib/recipe-schema";
import { haptics } from "@/lib/haptics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Brew {
  id: string;
  rating: number | null;
  notes: string | null;
  createdAt: string;
}

export function BrewLog({
  recipeId,
  currentRecipe,
}: {
  recipeId: string;
  currentRecipe: RecipeOutput;
}) {
  const [brews, setBrews] = useState<Brew[]>([]);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const d = await fetch(`/api/recipes/${recipeId}/brews`).then((r) =>
      r.json(),
    );
    if (d.brews) setBrews(d.brews);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  async function logBrew() {
    if (!rating && !notes.trim()) return;
    setBusy(true);
    haptics.light();
    try {
      await fetch(`/api/recipes/${recipeId}/brews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: rating || null,
          notes: notes.trim() || null,
          recipeSnapshot: currentRecipe,
        }),
      });
      haptics.success();
      setRating(0);
      setNotes("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    await fetch(`/api/brews/${id}`, { method: "DELETE" });
    setBrews((b) => b.filter((x) => x.id !== id));
  }

  return (
    <Card className="gap-3">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Brew log
      </span>

      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="p-1.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 rounded-md"
            onClick={() => {
              setRating(n === rating ? 0 : n);
              haptics.light();
            }}
          >
            <Star
              className={cn(
                "size-7 transition-colors",
                n <= rating
                  ? "fill-primary text-primary"
                  : "text-border",
              )}
            />
          </button>
        ))}
      </div>

      <Textarea
        rows={2}
        placeholder="Tasting notes for this brew (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button
        variant="outline"
        className="w-full"
        onClick={logBrew}
        disabled={busy || (!rating && !notes.trim())}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : "Log this brew"}
      </Button>

      {brews.length > 0 && (
        <div className="flex flex-col">
          {brews.map((b) => (
            <div
              key={b.id}
              className="flex items-start justify-between gap-3 border-t py-3"
            >
              <div className="min-w-0">
                <span className="tracking-widest text-primary text-sm">
                  {b.rating ? "★".repeat(b.rating) : "—"}
                </span>
                {b.notes && (
                  <span className="text-foreground"> {b.notes}</span>
                )}
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(b.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                aria-label="Delete brew"
                className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                onClick={() => del(b.id)}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
