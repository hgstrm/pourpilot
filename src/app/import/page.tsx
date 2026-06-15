"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { haptics } from "@/lib/haptics";

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
      setError(e instanceof Error ? e.message : "Import failed");
      setImporting(null);
    }
  }

  return (
    <main className="wrap">
      <div className="topbar">
        <Link href="/recipes" className="nav-link">
          ‹ Back
        </Link>
        <h1 style={{ fontSize: 18 }}>Import from xBloom</h1>
      </div>

      {error && <div className="toast err">{error}</div>}

      {!recipes && !error && (
        <div className="card skeleton-card">
          <div className="skeleton skeleton-line" style={{ width: "70%" }} />
          <div className="skeleton skeleton-line" style={{ width: "50%" }} />
          <div className="skeleton skeleton-line" style={{ width: "60%" }} />
        </div>
      )}

      {recipes && recipes.length === 0 && (
        <div className="empty">No recipes on your xBloom account.</div>
      )}

      {recipes?.map((r) => (
        <div key={r.id} className="recipe-item" style={{ cursor: "default" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{r.name}</div>
            <div className="meta">
              {r.doseG}g · 1:{r.ratio} · grind {r.grindSize} · {r.pours.length}{" "}
              pours
            </div>
          </div>
          <button
            className="chip"
            disabled={importing !== null}
            onClick={() => importOne(r)}
          >
            {importing === r.id ? <span className="spinner" /> : "Import"}
          </button>
        </div>
      ))}
    </main>
  );
}
