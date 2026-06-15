"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SavedRecipeDTO } from "@/lib/client-types";
import { targetWater } from "@/lib/client-types";

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
    <main className="wrap">
      <div className="topbar">
        <div className="brand">
          <span className="dot" />
          <h1>Saved recipes</h1>
        </div>
        <Link href="/" className="nav-link">
          + New
        </Link>
      </div>

      {error && <div className="toast err">{error}</div>}

      {!recipes && !error && (
        <p style={{ textAlign: "center" }}>
          <span className="spinner" style={{ borderTopColor: "#c9a36b" }} />
          Loading…
        </p>
      )}

      {recipes && recipes.length === 0 && (
        <div className="empty">
          <p>No recipes yet.</p>
          <Link href="/" className="nav-link">
            Snap a bag to get started
          </Link>
        </div>
      )}

      {recipes?.map((r) => (
        <Link key={r.id} href={`/recipes/${r.id}`} className="recipe-item">
          <div>
            <div style={{ fontWeight: 700 }}>
              {r.name}
              {r.xbloomId && <span className="pushed-pill">on xBloom</span>}
            </div>
            <div className="meta">
              {r.recipe.doseG}g · 1:{r.recipe.ratio} ·{" "}
              {targetWater(r.recipe)}ml · grind {r.recipe.grindSize} ·{" "}
              {r.recipe.pours.length} pours
            </div>
          </div>
          <span className="chev">›</span>
        </Link>
      ))}
    </main>
  );
}
