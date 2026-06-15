"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, Loader2 } from "lucide-react";

interface XbloomRecipe {
  id: number;
  name: string;
  doseG: number;
  ratio: number;
  grindSize: number;
  rpm: number;
  pours: unknown[];
}

export default function ImportPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<XbloomRecipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/import")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setRecipes(d.recipes)))
      .catch((e) => setError(String(e)));
  }, []);

  async function importOne(r: XbloomRecipe) {
    setImporting(r.id);
    haptics.light();
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xbloomId: r.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      haptics.success();
      router.push(`/recipes/${d.recipe.id}`);
    } catch (e) {
      haptics.warn();
      toast.error(e instanceof Error ? e.message : "Import failed");
      setImporting(null);
    }
  }

  return (
    <main className="app-wrap">
      <header className="flex items-center gap-3 mb-5">
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/recipes">
            <ChevronLeft className="size-4" /> Back
          </Link>
        </Button>
        <h1 className="text-lg font-bold">Import from xBloom</h1>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {!recipes && !error && (
        <Card className="gap-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-secondary" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-secondary" />
        </Card>
      )}

      {recipes && recipes.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No recipes on your xBloom account.
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {recipes?.map((r) => (
          <Card
            key={r.id}
            className="flex-row items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0">
              <div className="truncate font-bold">{r.name}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                {r.doseG}g · 1:{r.ratio} · grind {r.grindSize} ·{" "}
                {r.pours.length} pours
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 rounded-full"
              disabled={importing !== null}
              onClick={() => importOne(r)}
            >
              {importing === r.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Download className="size-4" /> Import
                </>
              )}
            </Button>
          </Card>
        ))}
      </div>
    </main>
  );
}
