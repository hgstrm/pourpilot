"use client";

import { useState } from "react";
import Link from "next/link";
import type { AnalysisResult, BeanInfo, RecipeOutput } from "@/lib/recipe-schema";
import { RecipeEditor } from "@/components/RecipeEditor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { haptics } from "@/lib/haptics";

type Stage = "capture" | "analyzing" | "review";
type Toast = { kind: "ok" | "err"; msg: string; href?: string } | null;

export default function Home() {
  const [stage, setStage] = useState<Stage>("capture");
  const [images, setImages] = useState<string[]>([]);
  const [bean, setBean] = useState<BeanInfo | null>(null);
  const [recipe, setRecipe] = useState<RecipeOutput | null>(null);
  const [reasoning, setReasoning] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [forceSearch, setForceSearch] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [url, setUrl] = useState("");
  const [details, setDetails] = useState("");

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
    setToast(null);
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
      setToast({ kind: "err", msg: errMsg(e) });
      setStage("capture");
    }
  }

  async function save() {
    if (!recipe) return;
    setBusy(true);
    setToast(null);
    try {
      if (savedId) {
        const res = await fetch(`/api/recipes/${savedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipe, bean }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setToast({ kind: "ok", msg: "Saved changes." });
      } else {
        const res = await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipe, bean }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSavedId(data.recipe.id);
        setToast({ kind: "ok", msg: "Saved to your collection." });
      }
    } catch (e) {
      setToast({ kind: "err", msg: errMsg(e) });
    } finally {
      setBusy(false);
    }
  }

  async function push() {
    if (!recipe) return;
    setBusy(true);
    setToast(null);
    try {
      // Make sure it's saved first so we can track the xBloom id.
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
      setToast({
        kind: "ok",
        msg: data.updated
          ? "Updated on your xBloom — open the app to brew."
          : "Sent to your xBloom — open the app to brew!",
      });
    } catch (e) {
      setToast({ kind: "err", msg: errMsg(e) });
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
    setToast(null);
    setSources([]);
    setSearched(false);
    setUrl("");
    setDetails("");
  }

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="brand">
          <span className="dot" />
          <h1>Bean → Brew</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/recipes" className="nav-link">
            Saved
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.kind}`}>
          {toast.msg}
          {toast.href && (
            <>
              {" "}
              <a href={toast.href} target="_blank" rel="noreferrer">
                open
              </a>
            </>
          )}
        </div>
      )}

      {stage === "capture" && (
        <>
          <div className="card">
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Product link (optional)</label>
              <input
                type="url"
                inputMode="url"
                placeholder="https://roaster.com/products/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Notes for the AI (optional)</label>
              <textarea
                placeholder="e.g. natural Ethiopian, I like it bright; grind a touch finer; 18g dose"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
              />
            </div>
            <label className="checks" style={{ marginTop: 12 }}>
              <input
                type="checkbox"
                checked={forceSearch}
                onChange={(e) => setForceSearch(e.target.checked)}
              />
              🔎 Always look up the bean online
            </label>
          </div>

          {images.length > 0 && (
            <div className="thumbs">
              {images.map((img, i) => (
                <div className="thumb" key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`bag ${i + 1}`} />
                  <button
                    className="thumb-x"
                    aria-label="Remove photo"
                    onClick={() => removePhoto(i)}
                  >
                    ×
                  </button>
                  <span className="thumb-tag">
                    {i === 0 ? "Front" : i === 1 ? "Back" : `#${i + 1}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {images.length < 3 && (
            <label className="dropzone">
              <span className="big">
                📷 {images.length === 0 ? "Snap your bean bag" : "Add another photo"}
              </span>
              <span className="small">
                {images.length === 0
                  ? "Tap for the front — add the back too for more detail"
                  : "e.g. the back of the bag with origin & process"}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) addPhoto(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}

          {images.length > 0 && (
            <button
              className="btn-primary"
              style={{ marginTop: 14 }}
              onClick={analyze}
            >
              ✨ Analyze {images.length > 1 ? `${images.length} photos` : "photo"}
            </button>
          )}

          <p className="total" style={{ textAlign: "center" }}>
            Add a product link or notes if you have them, snap the front (and
            back) of the bag, then analyze. The AI reads the label, looks up
            details when needed, and designs a pour-over you can tweak and send.
          </p>
        </>
      )}

      {stage === "analyzing" && (
        <div className="card">
          {image && <img className="preview" src={image} alt="bean bag" />}
          <p style={{ textAlign: "center" }}>
            <span className="spinner" style={{ borderTopColor: "#c9a36b" }} />
            Reading the label{forceSearch ? ", searching the web," : ""} &amp;
            designing your recipe…
          </p>
        </div>
      )}

      {stage === "review" && recipe && (
        <>
          {image && (
            <img className="preview" src={image} alt="bean bag" />
          )}

          {bean && (
            <div className="card">
              <p className="bean-name">{bean.name}</p>
              <div className="bean-tags">
                {bean.roaster && (
                  <span className="tag">
                    <strong>Roaster:</strong> {bean.roaster}
                  </span>
                )}
                {bean.origin && (
                  <span className="tag">
                    <strong>Origin:</strong> {bean.origin}
                  </span>
                )}
                {bean.process && (
                  <span className="tag">
                    <strong>Process:</strong> {bean.process}
                  </span>
                )}
                <span className="tag">
                  <strong>Roast:</strong> {bean.roastLevel}
                </span>
                {bean.tastingNotes?.map((n) => (
                  <span className="tag" key={n}>
                    {n}
                  </span>
                ))}
              </div>

              {searched && (
                <p className="total" style={{ marginTop: 12 }}>
                  {sources.length > 0 ? (
                    <>
                      🔎 Looked up online ·{" "}
                      {sources.map((s, i) => (
                        <span key={s}>
                          {i > 0 && " · "}
                          <a
                            href={s}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--accent)" }}
                          >
                            {hostOf(s)}
                          </a>
                        </span>
                      ))}
                    </>
                  ) : (
                    "🔎 Searched online but found no specific details — using a sensible default for this bean."
                  )}
                </p>
              )}
            </div>
          )}

          {reasoning && <p className="reasoning">{reasoning}</p>}

          <RecipeEditor recipe={recipe} onChange={setRecipe} />

          <button
            className="btn-ghost"
            style={{ width: "100%", marginTop: 4 }}
            onClick={reset}
          >
            Start over
          </button>
        </>
      )}

      {stage === "review" && recipe && (
        <div className="actionbar">
          <button className="btn-primary" onClick={save} disabled={busy}>
            {savedId ? "Save" : "Save"}
          </button>
          <button className="btn-push" onClick={push} disabled={busy}>
            {busy ? <span className="spinner" /> : "Send to xBloom"}
          </button>
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
