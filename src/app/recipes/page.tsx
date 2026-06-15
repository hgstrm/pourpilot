"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SavedRecipeDTO } from "@/lib/client-types";
import { targetWater } from "@/lib/client-types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Coffee, Loader2 } from "lucide-react";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<SavedRecipeDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setRecipes(d.recipes);
      })
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="app-wrap">
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-8 rounded-[7px]" />
          <h1 className="text-xl font-bold tracking-tight">Saved recipes</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/import">Import</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full">
            <Link href="/">+ New</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {!recipes && !error && (
        <p className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          Loading…
        </p>
      )}

      {recipes && recipes.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 text-center text-muted-foreground">
          <Coffee className="size-8 text-primary" />
          <p>No recipes yet.</p>
          <Button asChild>
            <Link href="/">Snap a bag to get started</Link>
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {recipes?.map((r) => (
          <Link key={r.id} href={`/recipes/${r.id}`} className="group">
            <Card className="flex-row items-center justify-between gap-3 p-4 transition-colors group-hover:border-primary/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-bold">
                  <span className="truncate">{r.name}</span>
                  {r.xbloomId && (
                    <Badge variant="accent" className="shrink-0">
                      on xBloom
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  {r.recipe.doseG}g · 1:{r.recipe.ratio} ·{" "}
                  {targetWater(r.recipe)}ml · grind {r.recipe.grindSize} ·{" "}
                  {r.recipe.pours.length} pours
                </div>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
