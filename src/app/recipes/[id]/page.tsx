"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { RecipeOutput } from "@/lib/recipe-schema";
import type { SavedRecipeDTO } from "@/lib/client-types";
import { RecipeEditor } from "@/components/RecipeEditor";
import { AdjustBar } from "@/components/AdjustBar";
import { BrewLog } from "@/components/BrewLog";
import { PushConfirm } from "@/components/PushConfirm";
import { haptics } from "@/lib/haptics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, Loader2, Trash2 } from "lucide-react";

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [saved, setSaved] = useState<SavedRecipeDTO | null>(null);
  const [recipe, setRecipe] = useState<RecipeOutput | null>(null);
  const [pushedRecipe, setPushedRecipe] = useState<RecipeOutput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setSaved(d.recipe);
          setRecipe(d.recipe.recipe);
          if (d.recipe.xbloomId) setPushedRecipe(d.recipe.recipe);
        }
      })
      .catch((e) => setError(String(e)));
  }, [id]);

  async function save() {
    if (!recipe) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSaved(d.recipe);
      haptics.success();
      toast.success("Saved.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function doPush() {
    if (!recipe) return;
    setBusy(true);
    try {
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe, savedId: id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      haptics.success();
      setPushedRecipe(recipe);
      setConfirming(false);
      toast.success(
        d.updated
          ? "Updated on your xBloom — open the app to brew."
          : "Sent to your xBloom — open the app to brew!",
      );
      const r2 = await fetch(`/api/recipes/${id}`).then((x) => x.json());
      if (r2.recipe) setSaved(r2.recipe);
    } catch (e) {
      haptics.warn();
      setConfirming(false);
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    setBusy(true);
    try {
      await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      router.push("/recipes");
    } catch {
      setBusy(false);
      setDeleteOpen(false);
    }
  }

  if (error) {
    return (
      <main className="app-wrap">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive mb-4">
          {error}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/recipes">
            <ChevronLeft className="size-4" /> Back
          </Link>
        </Button>
      </main>
    );
  }

  if (!saved || !recipe) {
    return (
      <main className="app-wrap">
        <Card className="gap-3">
          <div className="h-4 w-3/5 animate-pulse rounded bg-secondary" />
          <div className="h-4 w-2/5 animate-pulse rounded bg-secondary" />
          <div className="h-28 animate-pulse rounded bg-secondary" />
        </Card>
      </main>
    );
  }

  return (
    <main className="app-wrap">
      <header className="flex items-center justify-between mb-5">
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/recipes">
            <ChevronLeft className="size-4" /> Back
          </Link>
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          disabled={busy}
        >
          <Trash2 className="size-4" /> Delete
        </Button>
      </header>

      <div className="flex flex-col gap-4">
        {saved.bean && (
          <Card className="gap-3">
            <p className="text-lg font-bold">{saved.bean.name}</p>
            <div className="flex flex-wrap gap-2">
              {saved.bean.origin && (
                <Badge variant="secondary">{saved.bean.origin}</Badge>
              )}
              {saved.bean.process && (
                <Badge variant="secondary">{saved.bean.process}</Badge>
              )}
              <Badge variant="accent">{saved.bean.roastLevel}</Badge>
              {saved.xbloomId && <Badge variant="accent">on xBloom</Badge>}
            </div>
          </Card>
        )}

        <AdjustBar
          recipe={recipe}
          bean={saved.bean}
          onAdjusted={(next, note) => {
            setRecipe(next);
            toast.success(note);
          }}
          onError={(msg) => toast.error(msg)}
        />

        <RecipeEditor recipe={recipe} onChange={setRecipe} />

        <BrewLog recipeId={id} currentRecipe={recipe} />
      </div>

      <div className="action-bar">
        <Button
          variant="outline"
          className="flex-1"
          onClick={save}
          disabled={busy}
        >
          Save
        </Button>
        <Button
          variant="accent"
          className="flex-1"
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          {saved.xbloomId ? "Update xBloom" : "Send to xBloom"}
        </Button>
      </div>

      <PushConfirm
        open={confirming}
        next={recipe}
        previous={pushedRecipe}
        isUpdate={Boolean(saved.xbloomId)}
        busy={busy}
        onConfirm={doPush}
        onOpenChange={setConfirming}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this recipe?</DialogTitle>
            <DialogDescription>
              It will be removed from your collection here. It stays on your
              xBloom app.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={del}
              disabled={busy}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}
