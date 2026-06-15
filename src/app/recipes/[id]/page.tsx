"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { RecipeOutput } from "@/lib/recipe-schema";
import type { SavedRecipeDTO } from "@/lib/client-types";
import { RecipeEditor } from "@/components/RecipeEditor";

type Toast = { kind: "ok" | "err"; msg: string } | null;

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [saved, setSaved] = useState<SavedRecipeDTO | null>(null);
  const [recipe, setRecipe] = useState<RecipeOutput | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setSaved(d.recipe);
          setRecipe(d.recipe.recipe);
        }
      })
      .catch((e) => setError(String(e)));
  }, [id]);

  async function save() {
    if (!recipe) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSaved(d.recipe);
      setToast({ kind: "ok", msg: "Saved." });
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
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe, savedId: id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setToast({
        kind: "ok",
        msg: d.updated
          ? "Updated on your xBloom — open the app to brew."
          : "Sent to your xBloom — open the app to brew!",
      });
      // refresh to pick up xbloomId
      const r2 = await fetch(`/api/recipes/${id}`).then((x) => x.json());
      if (r2.recipe) setSaved(r2.recipe);
    } catch (e) {
      setToast({ kind: "err", msg: errMsg(e) });
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm("Delete this recipe? (It stays on your xBloom app.)")) return;
    setBusy(true);
    try {
      await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      router.push("/recipes");
    } catch {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="wrap">
        <div className="toast err">{error}</div>
        <Link href="/recipes" className="nav-link">
          ‹ Back
        </Link>
      </main>
    );
  }

  if (!saved || !recipe) {
    return (
      <main className="wrap">
        <p style={{ textAlign: "center" }}>
          <span className="spinner" style={{ borderTopColor: "#c9a36b" }} />
          Loading…
        </p>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="topbar">
        <Link href="/recipes" className="nav-link">
          ‹ Back
        </Link>
        <button
          className="btn-danger"
          style={{ minHeight: 44 }}
          onClick={del}
          disabled={busy}
        >
          Delete
        </button>
      </div>

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}

      {saved.bean && (
        <div className="card">
          <p className="bean-name">{saved.bean.name}</p>
          <div className="bean-tags">
            {saved.bean.origin && (
              <span className="tag">
                <strong>Origin:</strong> {saved.bean.origin}
              </span>
            )}
            {saved.bean.process && (
              <span className="tag">
                <strong>Process:</strong> {saved.bean.process}
              </span>
            )}
            <span className="tag">
              <strong>Roast:</strong> {saved.bean.roastLevel}
            </span>
            {saved.xbloomId && <span className="pushed-pill">on xBloom</span>}
          </div>
        </div>
      )}

      <RecipeEditor recipe={recipe} onChange={setRecipe} />

      <div className="actionbar">
        <button className="btn-primary" onClick={save} disabled={busy}>
          Save
        </button>
        <button className="btn-push" onClick={push} disabled={busy}>
          {busy ? (
            <span className="spinner" />
          ) : saved.xbloomId ? (
            "Update xBloom"
          ) : (
            "Send to xBloom"
          )}
        </button>
      </div>
    </main>
  );
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}
