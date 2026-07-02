"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { AnalysisResult, BeanInfo, RecipeOutput } from "@/lib/recipe-schema";
import { RecipeEditor } from "@/components/RecipeEditor";
import { AdjustBar } from "@/components/AdjustBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountButton } from "@/components/AccountButton";
import { SetupNotice } from "@/components/SetupNotice";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Bot,
  Calculator,
  CheckCircle2,
  Flame,
  ImagePlus,
  Link2,
  Loader2,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Snowflake,
  Sparkles,
  X,
} from "lucide-react";

type Stage = "capture" | "analyzing" | "review";
type BrewMode = "hot" | "iced";

export default function Home() {
  const [stage, setStage] = useState<Stage>("capture");
  const [images, setImages] = useState<string[]>([]);
  const [bean, setBean] = useState<BeanInfo | null>(null);
  const [recipe, setRecipe] = useState<RecipeOutput | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [forceSearch, setForceSearch] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [url, setUrl] = useState("");
  const [details, setDetails] = useState("");
  const [brewMode, setBrewMode] = useState<BrewMode>("hot");
  const [brewWaterMl, setBrewWaterMl] = useState(150);
  const [iceG, setIceG] = useState(100);

  const image = images[0] ?? null;

  async function addPhoto(file: File) {
    const dataUrl = await fileToDataUrl(file);
    setImages((imgs) => [...imgs, dataUrl].slice(0, 3));
    haptics.light();
  }

  function removePhoto(i: number) {
    setImages((imgs) => imgs.filter((_, idx) => idx !== i));
  }

  async function analyze() {
    setStage("analyzing");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          search: forceSearch || undefined,
          url: url.trim() || undefined,
          details: details.trim() || undefined,
          brewMode,
          brewWaterMl: brewMode === "iced" ? brewWaterMl : undefined,
          iceG: brewMode === "iced" ? iceG : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      const result = data as AnalysisResult & {
        sources?: string[];
        searched?: boolean;
      };
      setBean(result.bean);
      setRecipe(result.recipe);
      setReasoning(result.recipe.reasoning);
      setSources(result.sources ?? []);
      setSearched(Boolean(result.searched));
      haptics.success();
      setStage("review");
    } catch (e) {
      haptics.warn();
      toast.error(errMsg(e));
      setStage("capture");
    }
  }

  async function save() {
    if (!recipe) return;
    setBusy(true);
    try {
      if (savedId) {
        const res = await fetch(`/api/recipes/${savedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipe, bean }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Saved changes.");
      } else {
        const res = await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipe, bean }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSavedId(data.recipe.id);
        toast.success("Saved to your collection.");
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function push() {
    if (!recipe) return;
    setBusy(true);
    try {
      let id = savedId;
      if (!id) {
        const res = await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipe, bean }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        id = data.recipe.id;
        setSavedId(id);
      }
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe, savedId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      haptics.success();
      toast.success(
        data.updated
          ? "Updated on your xBloom — open the app to brew."
          : "Sent to your xBloom — open the app to brew!",
      );
    } catch (e) {
      haptics.warn();
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStage("capture");
    setImages([]);
    setBean(null);
    setRecipe(null);
    setSavedId(null);
    setSources([]);
    setSearched(false);
    setUrl("");
    setDetails("");
  }

  return (
    <main className="app-wrap">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.svg"
            alt=""
            className="size-9 rounded-[8px] shadow-sm"
          />
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-[0]">PourPilot</h1>
            <p className="truncate text-xs text-muted-foreground">
              xBloom recipe maker
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="rounded-full"
          >
            <Link href="/cold-brew" aria-label="Cold brew calculator">
              <Calculator className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="icon"
            className="rounded-full"
          >
            <Link href="/assistant" aria-label="Assistant">
              <Bot className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/recipes">Saved</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="icon"
            className="rounded-full"
          >
            <Link href="/settings" aria-label="Settings">
              <Settings className="size-4" />
            </Link>
          </Button>
          <AccountButton />
          <ThemeToggle />
        </div>
      </header>

      {stage === "capture" && (
        <div className="flex flex-col gap-4">
          <SetupNotice />

          <section className="overflow-hidden rounded-[1.25rem] border bg-card shadow-sm">
            <div className="border-b bg-secondary/35 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                    <Sparkles className="size-3.5" />
                    Recipe setup
                  </p>
                  <h2 className="mt-1 text-lg font-bold tracking-[0]">
                    Build an xBloom recipe
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                  Optional inputs
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border bg-background/70 p-1">
                <button
                  type="button"
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all",
                    brewMode === "hot"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary",
                  )}
                  onClick={() => setBrewMode("hot")}
                >
                  <Flame className="size-4" />
                  Hot
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all",
                    brewMode === "iced"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary",
                  )}
                  onClick={() => setBrewMode("iced")}
                >
                  <Snowflake className="size-4" />
                  Iced
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 p-4">
              {brewMode === "iced" && (
                <div className="grid grid-cols-2 gap-3 rounded-xl border bg-accent/10 p-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="brew-water">Brew water</Label>
                    <Input
                      id="brew-water"
                      type="number"
                      inputMode="decimal"
                      min={40}
                      max={500}
                      step={5}
                      value={brewWaterMl}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!Number.isNaN(v)) setBrewWaterMl(v);
                      }}
                      className="bg-background"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ice-g">Ice</Label>
                    <Input
                      id="ice-g"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={500}
                      step={5}
                      value={iceG}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!Number.isNaN(v)) setIceG(v);
                      }}
                      className="bg-background"
                    />
                  </div>
                  <p className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-accent" />
                    {Math.round(brewWaterMl)}ml through coffee,{" "}
                    {Math.round(iceG)}g ice in cup
                  </p>
                </div>
              )}

              <div className="rounded-xl border bg-background/70 p-3">
                <Label htmlFor="url" className="text-foreground">
                  <Link2 className="size-4 text-primary" />
                  Roaster link (optional)
                </Label>
                <Input
                  id="url"
                  type="url"
                  inputMode="url"
                  placeholder="https://roaster.com/products/coffee"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-2 bg-card"
                />
              </div>

              <div className="rounded-xl border bg-background/70 p-3">
                <Label htmlFor="details" className="text-foreground">
                  <NotebookPen className="size-4 text-primary" />
                  Taste notes (optional)
                </Label>
                <Textarea
                  id="details"
                  rows={3}
                  placeholder="Natural Ethiopian, bright fruit, 18g dose"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="mt-2 bg-card"
                />
              </div>

              <label className="flex items-center justify-between gap-3 rounded-xl border bg-secondary/35 p-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <Search className="size-4 text-primary" />
                  Search roaster details
                </span>
                <Checkbox
                  checked={forceSearch}
                  onCheckedChange={(c) => setForceSearch(c === true)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-[1.25rem] border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Bean photos (optional)</p>
                <p className="text-sm text-muted-foreground">
                  {images.length}/3 added
                </p>
              </div>
              <span className="grid size-9 place-items-center rounded-lg bg-primary/12 text-primary">
                <Camera className="size-4" />
              </span>
            </div>

            {images.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-xl border bg-black"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`bag ${i + 1}`}
                      className="size-full object-cover"
                    />
                    <button
                      aria-label="Remove photo"
                      className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"
                      onClick={() => removePhoto(i)}
                    >
                      <X className="size-3.5" />
                    </button>
                    <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[11px] text-white">
                      {i === 0 ? "Front" : i === 1 ? "Back" : `#${i + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {images.length < 3 && (
              <label className="group flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed bg-secondary/45 p-7 text-center transition-colors hover:border-primary hover:bg-secondary">
                <span className="grid size-12 place-items-center rounded-xl bg-card text-primary shadow-sm transition-transform group-hover:scale-[1.03]">
                  <ImagePlus className="size-6" />
                </span>
                <span className="font-semibold">
                  {images.length === 0
                    ? "Add bag photos if you have them"
                    : "Add another photo"}
                </span>
                <span className="max-w-72 text-sm text-muted-foreground">
                  Front and back help identify origin, process, and roast level
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) addPhoto(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}

            <Button
              size="lg"
              onClick={analyze}
              className="mt-3 w-full"
            >
              <Sparkles className="size-4" />
              {images.length === 0
                ? "Build recipe"
                : `Analyze photos (${images.length})`}
            </Button>
          </section>
        </div>
      )}

      {stage === "analyzing" && (
        <Card className="items-center text-center">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt="coffee bag"
              className="max-h-72 w-full rounded-lg border object-contain bg-black"
            />
          )}
          <p className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            {images.length > 0
              ? "Reading the bag and building the recipe..."
              : "Building your recipe..."}
          </p>
        </Card>
      )}

      {stage === "review" && recipe && (
        <div className="flex flex-col gap-4">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt="coffee bag"
              className="max-h-72 w-full rounded-xl border object-contain bg-black"
            />
          )}

          {bean && (
            <Card className="gap-3">
              <p className="text-lg font-bold">{bean.name}</p>
              <div className="flex flex-wrap gap-2">
                {bean.roaster && (
                  <Badge variant="secondary">{bean.roaster}</Badge>
                )}
                {bean.origin && (
                  <Badge variant="secondary">{bean.origin}</Badge>
                )}
                {bean.process && (
                  <Badge variant="secondary">{bean.process}</Badge>
                )}
                <Badge variant="accent">{bean.roastLevel}</Badge>
                {bean.tastingNotes?.map((n) => (
                  <Badge key={n} variant="outline">
                    {n}
                  </Badge>
                ))}
              </div>

              {searched && (
                <p className="text-sm text-muted-foreground">
                  {sources.length > 0 ? (
                    <>
                      <Search className="mr-1 inline size-3.5" />
                      Looked up online ·{" "}
                      {sources.map((s, i) => (
                        <span key={s}>
                          {i > 0 && " · "}
                          <a
                            href={s}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {hostOf(s)}
                          </a>
                        </span>
                      ))}
                    </>
                  ) : (
                    "Searched online but found no specific details — using a sensible default for this bean."
                  )}
                </p>
              )}
            </Card>
          )}

          {reasoning && (
            <p className="border-l-2 border-primary pl-3 text-sm italic text-muted-foreground">
              {reasoning}
            </p>
          )}

          <AdjustBar
            recipe={recipe}
            bean={bean}
            savedId={savedId}
            onAdjusted={(next, note) => {
              setRecipe(next);
              setReasoning(note);
              toast.success("Recipe improved.");
            }}
            onError={(msg) => toast.error(msg)}
          />

          <RecipeEditor recipe={recipe} onChange={setRecipe} />

          <Button variant="ghost" className="w-full" onClick={reset}>
            <Plus className="size-4 rotate-45" />
            Start over
          </Button>
        </div>
      )}

      {stage === "review" && recipe && (
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
            onClick={push}
            disabled={busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Send to xBloom"}
          </Button>
        </div>
      )}
    </main>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}
