"use client";

import { useEffect, useState } from "react";
import type { RecipeOutput } from "@/lib/recipe-schema";
import { haptics } from "@/lib/haptics";

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
    <div className="card">
      <p className="section-title">Brew log</p>

      <div className="stars" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`star ${n <= rating ? "on" : ""}`}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => {
              setRating(n === rating ? 0 : n);
              haptics.light();
            }}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        className="brew-notes"
        rows={2}
        placeholder="Tasting notes for this brew (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button
        className="btn-ghost"
        style={{ width: "100%", marginTop: 10 }}
        onClick={logBrew}
        disabled={busy || (!rating && !notes.trim())}
      >
        {busy ? <span className="spinner" /> : "Log this brew"}
      </button>

      {brews.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {brews.map((b) => (
            <div className="brew-row" key={b.id}>
              <div>
                <span className="brew-stars">
                  {b.rating ? "★".repeat(b.rating) : "—"}
                </span>
                {b.notes && <span className="brew-note"> {b.notes}</span>}
                <div className="meta">
                  {new Date(b.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                className="brew-del"
                aria-label="Delete brew"
                onClick={() => del(b.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
