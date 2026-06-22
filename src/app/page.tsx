"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { AnalysisResult, BeanInfo, RecipeOutput } from "@/lib/recipe-schema";
import { RecipeEditor } from "@/components/RecipeEditor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { haptics } from "@/lib/haptics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Calculator,
  Flame,
  Loader2,
  Plus,
  Search,
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
    if (images.length === 0) return;
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
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-8 rounded-[7px]" />
          <h1 className="text-xl font-bold tracking-tight">PourPilot</h1>
        </div>
        <div className="flex items-center gap-2">
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
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/recipes">Saved</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {stage === "capture" && (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-col gap-2">
              <Label>Brew style</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={brewMode === "hot" ? "default" : "secondary"}
                  className="justify-center"
                  onClick={() => setBrewMode("hot")}
                >
                  <Flame className="size-4" />
                  Hot
                </Button>
                <Button
                  variant={brewMode === "iced" ? "default" : "secondary"}
                  className="justify-center"
                  onClick={() => setBrewMode("iced")}
                >
                  <Snowflake className="size-4" />
                  Iced
                </Button>
              </div>
            </div>

            {brewMode === "iced" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="brew-water">Brew water (ml)</Label>
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
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ice-g">Ice (g)</Label>
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
                  />
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  xBloom pours {Math.round(brewWaterMl)}ml; add{" "}
                  {Math.round(iceG)}g ice to the cup.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="url">Product link (optional)</Label>
              <Input
                id="url"
                type="url"
                inputMode="url"
                placeholder="https://roaster.com/products/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="details">Notes for the AI (optional)</Label>
              <Textarea
                id="details"
                rows={3}
                placeholder="e.g. natural Ethiopian, I like it bright; grind a touch finer; 18g dose"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Checkbox
                checked={forceSearch}
                onCheckedChange={(c) => setForceSearch(c === true)}
              />
              <Search className="size-4" /> Always look up the bean online
            </label>
          </Card>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative size-24 overflow-hidden rounded-xl border bg-black"
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
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed bg-secondary/50 p-8 text-center transition-colors hover:border-primary hover:bg-secondary">
              <Camera className="size-7 text-primary" />
              <span className="font-semibold">
                {images.length === 0 ? "Snap your beans" : "Add another photo"}
              </span>
              <span className="text-sm text-muted-foreground">
                {images.length === 0
                  ? "Tap for the front — add the back too for more detail"
                  : "e.g. the back of the bag with origin & process"}
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

          {images.length > 0 && (
            <Button size="lg" onClick={analyze}>
              <Sparkles className="size-4" />
              Analyze {images.length > 1 ? `${images.length} photos` : "photo"}
            </Button>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Add a product link or notes if you have them, snap the front (and
            back) of the bag, then analyze. The AI reads the label, looks up
            details when needed, and designs a pour-over you can tweak and send.
          </p>
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
            Reading the label{forceSearch ? ", searching the web," : ""} &
            designing your recipe…
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
