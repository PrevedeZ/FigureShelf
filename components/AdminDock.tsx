"use client";

import { useMemo, useState } from "react";
import { useCatalog } from "./catalog";
import { toAppFigure } from "./figureAdapter";
import type { Figure } from "./types";

async function safeJSON(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

export default function AdminDock() {
  // Your catalog context returns { figures?, series? } where series is string[]
  const catalog = useCatalog() as any; // (we access optional helpers dynamically)
  const seriesNames: string[] = (catalog.series ?? []) as string[];
  const rawFigures = catalog.figures ?? [];

  // Convert raw catalog figures -> app Figure
  const figures: Figure[] = useMemo(
    () => rawFigures.map((f: any) => toAppFigure(f)),
    [rawFigures]
  );

  // Index figures by series name
  const bySeries = useMemo(() => {
    const m = new Map<string, Figure[]>();
    for (const f of figures) {
      const key = f.series || "Unassigned";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(f);
    }
    for (const [, arr] of m) arr.sort((a, b) => a.name.localeCompare(b.name));
    return m;
  }, [figures]);

  // ----- Create series -----
  const [newSeries, setNewSeries] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshCatalog =
    (catalog?.refreshCatalog as undefined | (() => Promise<void>)) ??
    (catalog?.refresh as undefined | (() => Promise<void>)) ??
    (async () => {});

  async function createSeries() {
    const name = newSeries.trim();
    if (!name) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/series", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!r.ok) {
        const j = await safeJSON(r);
        alert(j?.error ?? "Could not create series.");
      } else {
        setNewSeries("");
        await refreshCatalog();
      }
    } finally {
      setBusy(false);
    }
  }

  // Optional delete by **name** (only if you have such an endpoint)
  async function deleteSeriesByName(name: string) {
    if (!confirm(`Delete series "${name}"? Figures keep existing but lose assignment.`)) return;
    const r = await fetch(`/api/admin/series/by-name?name=${encodeURIComponent(name)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) {
      const j = await safeJSON(r);
      alert(j?.error ?? "Could not delete series (endpoint by-name may not exist).");
      return;
    }
    await refreshCatalog();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Admin Dock</h1>

      {/* Create series */}
      <div className="card p-4 flex items-end gap-2">
        <div className="flex-1">
          <label className="text-sm text-gray-600">Create new series</label>
          <input
            className="field w-full"
            placeholder="Series name (e.g., Dragonball)"
            value={newSeries}
            onChange={(e) => setNewSeries(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" disabled={busy || !newSeries.trim()} onClick={createSeries}>
          {busy ? "Creating…" : "Create"}
        </button>
      </div>

      {/* Collapsible — figures by series */}
      <div className="space-y-3">
        {seriesNames.length === 0 ? (
          <div className="card p-4 text-gray-600">No series yet.</div>
        ) : (
          seriesNames
            .slice()
            .sort((a, b) => a.localeCompare(b))
            .map((name) => {
              const list = bySeries.get(name) ?? [];
              return (
                <details key={name} open className="card">
                  <summary className="p-3 cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{name}</div>
                      <span className="badge">{list.length}</span>
                    </div>
                    <button
                      className="btn btn-ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        deleteSeriesByName(name);
                      }}
                    >
                      Delete series
                    </button>
                  </summary>

                  <div className="p-3 border-t border-[var(--border)]">
                    {list.length === 0 ? (
                      <div className="text-gray-600">No figures in this series yet.</div>
                    ) : (
                      <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {list.map((f) => (
                          <li key={f.id} className="card p-3">
                            <div className="text-sm text-gray-600">{f.releaseYear}</div>
                            <div className="font-medium truncate">{f.name}</div>
                            <div className="text-xs truncate">
                              {(f.characterBase ?? f.character)}
                              {f.variant ? ` (${f.variant})` : ""}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              );
            })
        )}
      </div>
    </div>
  );
}
