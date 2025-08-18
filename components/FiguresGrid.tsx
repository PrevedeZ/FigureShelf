"use client";
import { useMemo, useState, useEffect } from "react";
import type { Figure } from "./types";
import Image from "next/image";
import FigureCard from "./FigureCard";
import { useCollection } from "./CollectionStore";
import { useCurrency, formatCents } from "./CurrencyContext";
import { useCatalog, splitCharacter } from "./catalog";

type View = "grid" | "list";
type SortKey = "name" | "year" | "msrpAsc" | "msrpDesc";

const NO_VARIANT = "__base__";
type CharKey = string; // `${series}::${base}`

export default function FiguresGrid({
  figures,
  onAdd,
  onEditOwned,
  onOpenWish,
  onManageOwned,
  onSeriesFilterChange, // NEW
}: {
  figures: Figure[];
  onAdd: (f: Figure) => void;
  onEditOwned: (ownedId: string, f: Figure) => void;
  onOpenWish: (f: Figure) => void;
  onManageOwned: (f: Figure) => void;
  onSeriesFilterChange?: (series: string[]) => void; // NEW
}) {
  const [tab, setTab] = useState<"all" | "owned" | "wishlist">("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const { series: allSeries } = useCatalog();

  // series + character + variant filters
  const [seriesSel, setSeriesSel] = useState<string[]>([]);
  const [charSel, setCharSel] = useState<CharKey[]>([]);
  const [variantSel, setVariantSel] = useState<Record<CharKey, Set<string>>>({});

  // notify parent (KPI bar) when series selection changes
  useEffect(() => {
    onSeriesFilterChange?.(seriesSel);
  }, [seriesSel, onSeriesFilterChange]);

  const { owned, wishlist, removeWish, isWished, wishFor, ownedCountForFigure } = useCollection();
  const { currency, convert } = useCurrency();

  // Build index: series -> base character -> set(variants)
  const index = useMemo(() => {
    const map = new Map<string, Map<string, Set<string>>>();
    for (const f of figures) {
      const series = f.series;
      const base = (f.characterBase && f.characterBase.trim()) || splitCharacter(f.character).base;
      const variantRaw = (f.variant && f.variant.trim()) || splitCharacter(f.character).variant;
      const variant = variantRaw ? variantRaw : NO_VARIANT;

      if (!map.has(series)) map.set(series, new Map());
      const chars = map.get(series)!;
      if (!chars.has(base)) chars.set(base, new Set());
      chars.get(base)!.add(variant);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([series, chars]) => ({
        series,
        characters: [...chars.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([base, variants]) => ({ base, variants: [...variants].sort((a, b) => a.localeCompare(b)) })),
      }));
  }, [figures]);

  // Filtering pipeline
  const filtered = useMemo(() => {
    let list = figures;

    if (seriesSel.length) list = list.filter((f) => seriesSel.includes(f.series));

    if (charSel.length) {
      const selectedSet = new Set(charSel);
      list = list.filter((f) => {
        const base = (f.characterBase && f.characterBase.trim()) || splitCharacter(f.character).base;
        const variantRaw = (f.variant && f.variant.trim()) || splitCharacter(f.character).variant;
        const key: CharKey = `${f.series}::${base}`;
        if (!selectedSet.has(key)) return false;
        const allowed = variantSel[key];
        const v = variantRaw ? variantRaw : NO_VARIANT;
        if (!allowed || allowed.size === 0) return true; // "All"
        return allowed.has(v);
      });
    }

    if (q) list = list.filter((f) => `${f.name} ${f.character} ${f.series}`.toLowerCase().includes(q.toLowerCase()));

    if (tab === "owned") {
      const ids = new Set(owned.map((o) => o.figureId));
      list = list.filter((f) => ids.has(f.id));
    }
    if (tab === "wishlist") {
      const ids = new Set(wishlist.map((w) => w.figureId));
      list = list.filter((f) => ids.has(f.id));
    }

    const withMsrp = list.map((f) => ({ f, msrpDisplay: convert(f.msrpCents, f.msrpCurrency, currency) }));
    withMsrp.sort((a, b) => {
      switch (sortKey) {
        case "name": return a.f.name.localeCompare(b.f.name);
        case "year": return b.f.releaseYear - a.f.releaseYear;
        case "msrpAsc": return a.msrpDisplay - b.msrpDisplay;
        case "msrpDesc": return b.msrpDisplay - a.msrpDisplay;
      }
    });
    return withMsrp.map((x) => x.f);
  }, [figures, seriesSel, charSel, variantSel, q, tab, owned, wishlist, sortKey, currency, convert]);

  const clearFilters = () => {
    setSeriesSel([]); setCharSel([]); setVariantSel({}); setQ(""); setTab("all"); setSortKey("name");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* Sidebar filters */}
      <aside className="card p-4 h-fit sticky top-[76px] hidden lg:block">
        <h4 className="mb-3 font-semibold">Series</h4>
        <MultiSelect options={allSeries ?? []} value={seriesSel} onChange={setSeriesSel} />

        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <h4 className="mb-3 font-semibold">Characters by Series</h4>

          <div className="space-y-3">
            {index.map(({ series, characters }) => {
              if (seriesSel.length && !seriesSel.includes(series)) return null;
              return (
                <details key={series} open>
                  <summary className="cursor-pointer select-none mb-2 font-medium">{series}</summary>
                  <div className="pl-1 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {characters.map(({ base }) => {
                        const key: CharKey = `${series}::${base}`;
                        const selected = charSel.includes(key);
                        return (
                          <button
                            key={key}
                            className={`badge ${selected ? "" : "opacity-60"}`}
                            onClick={() => {
                              setCharSel((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
                              setVariantSel((prev) => (prev[key] ? prev : { ...prev, [key]: new Set() }));
                            }}
                          >
                            {base}
                          </button>
                        );
                      })}
                    </div>

                    {/* Variants for selected characters */}
                    {characters.map(({ base, variants }) => {
                      const key: CharKey = `${series}::${base}`;
                      if (!charSel.includes(key)) return null;

                      const selectedSet = variantSel[key] ?? new Set<string>();
                      const allSelected = selectedSet.size === 0;
                      const hasBase = variants.includes(NO_VARIANT);
                      const shown = variants.filter((v) => v !== NO_VARIANT).map((v) => ({ value: v, label: v }));

                      return (
                        <div key={key} className="mt-2 border border-[var(--border)] rounded-lg p-2">
                          <div className="text-xs text-gray-600 mb-1">Variants for <strong>{base}</strong></div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button className={`badge ${allSelected ? "" : "opacity-60"}`}
                                    onClick={() => setVariantSel((prev) => ({ ...prev, [key]: new Set() }))}>
                              All
                            </button>
                            {hasBase && (
                              <CheckboxChip
                                label="No variant"
                                checked={allSelected ? true : selectedSet.has(NO_VARIANT)}
                                dimWhenUnchecked={!allSelected && !selectedSet.has(NO_VARIANT)}
                                onToggle={() => {
                                  setVariantSel((prev) => {
                                    const next = new Set(prev[key] ?? []);
                                    if (allSelected) next.add(NO_VARIANT);
                                    else if (next.has(NO_VARIANT)) next.delete(NO_VARIANT); else next.add(NO_VARIANT);
                                    return { ...prev, [key]: next };
                                  });
                                }}
                              />
                            )}
                            {shown.map(({ value, label }) => (
                              <CheckboxChip
                                key={value}
                                label={label}
                                checked={allSelected ? true : selectedSet.has(value)}
                                dimWhenUnchecked={!allSelected && !selectedSet.has(value)}
                                onToggle={() => {
                                  setVariantSel((prev) => {
                                    const next = new Set(prev[key] ?? []);
                                    if (allSelected) next.add(value);
                                    else if (next.has(value)) next.delete(value); else next.add(value);
                                    return { ...prev, [key]: next };
                                  });
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button className="btn btn-ghost" onClick={clearFilters}>Reset</button>
        </div>
      </aside>

      {/* Main */}
      <main className="space-y-4">
        {/* Toolbar */}
        <div className="card p-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden w-full sm:w-96">
            <input className="field rounded-none border-0 flex-1" placeholder="Search figures…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-[var(--border)] p-1">
              {(["all", "owned", "wishlist"] as const).map((t) => (
                <button key={t}
                        className={`px-3 py-2 rounded-md text-sm ${tab === t ? "bg-gray-100" : "hover:bg-gray-50"}`}
                        onClick={() => setTab(t)}>
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <select className="field w-[180px]" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
              <option value="name">Sort: Name</option>
              <option value="year">Sort: Year (newest)</option>
              <option value="msrpAsc">Sort: MSRP (low → high)</option>
              <option value="msrpDesc">Sort: MSRP (high → low)</option>
            </select>

            <div className="rounded-lg border border-[var(--border)] p-1">
              <button className={`px-3 py-2 rounded-md text-sm ${view === "grid" ? "bg-gray-100" : ""}`} onClick={() => setView("grid")}>Grid</button>
              <button className={`px-3 py-2 rounded-md text-sm ${view === "list" ? "bg-gray-100" : ""}`} onClick={() => setView("list")}>List</button>
            </div>

            {(q || seriesSel.length || charSel.length || Object.keys(variantSel).length || tab !== "all" || sortKey !== "name") && (
              <button className="btn btn-ghost" onClick={clearFilters}>Reset</button>
            )}
          </div>
        </div>

        {/* Results */}
        {view === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((f) => (
              <FigureCard key={f.id} fig={f}
                onAdd={onAdd}
                onEditOwned={onEditOwned}
                onWishlist={() => onOpenWish(f)}
                onManageOwned={onManageOwned}
              />
            ))}
            {filtered.length === 0 && <div className="col-span-full text-center text-gray-600 py-16">No results.</div>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((f) => (
              <ListRow key={f.id} fig={f} onAdd={onAdd} onOpenWish={() => onOpenWish(f)} onManage={() => onManageOwned(f)} />
            ))}
            {filtered.length === 0 && <div className="text-center text-gray-600 py-16">No results.</div>}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- small UI helpers ---------- */
function MultiSelect({ options, value, onChange }:{ options: string[]; value: string[]; onChange:(v:string[])=>void; }) {
  const toggle = (s: string) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((s) => (
        <button key={s} className={`badge ${value.includes(s) ? "" : "opacity-60"}`} onClick={() => toggle(s)}>{s}</button>
      ))}
    </div>
  );
}
function CheckboxChip({ label, checked, dimWhenUnchecked, onToggle }:{ label:string; checked:boolean; dimWhenUnchecked?:boolean; onToggle:()=>void; }) {
  return (
    <button className={`badge ${checked ? "" : (dimWhenUnchecked ? "opacity-40" : "opacity-60")}`} onClick={onToggle} aria-pressed={checked}>
      {label}
    </button>
  );
}
function ListRow({ fig, onAdd, onOpenWish, onManage }:{ fig:Figure; onAdd:(f:Figure)=>void; onOpenWish:()=>void; onManage:()=>void; }) {
  const { convert, currency } = useCurrency();
  const { isWished, wishFor, ownedCountForFigure, removeWish } = useCollection();
  const msrp = convert(fig.msrpCents, fig.msrpCurrency, currency);
  const ownedCount = ownedCountForFigure(fig.id);
  const wished = isWished(fig.id);
  const wish = wishFor(fig.id);
  return (
    <div className="card p-2 flex items-center gap-3">
      <div className="relative h-16 w-12 overflow-hidden rounded-md flex-shrink-0">
        <Image src={fig.image} alt={fig.name} fill className="object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="badge">{fig.series}</div>
          {fig.releaseType && <div className="badge">{fig.releaseType}</div>}
          {ownedCount > 0 && <div className="badge">Owned ×{ownedCount}</div>}
          {!ownedCount && wished && <div className="badge">Wish</div>}
          {ownedCount && wished && !wish?.wantAnother && <div className="badge">Wish (Owned)</div>}
        </div>
        <div className="font-medium truncate">{fig.name}</div>
        <div className="text-sm text-gray-600 truncate">{(fig.characterBase ?? fig.character)}{fig.variant ? ` (${fig.variant})` : ""} · {fig.releaseYear}</div>
      </div>
      <div className="text-sm text-gray-800">{formatCents(msrp, currency)}</div>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={() => onAdd(fig)}>{ownedCount ? "Add another" : "Add"}</button>
        {wished ? <button className="btn btn-ghost" onClick={() => removeWish(fig.id)}>Remove wish</button>
                : <button className="btn btn-ghost" onClick={onOpenWish}>Wishlist</button>}
        {ownedCount > 0 && <button className="btn btn-ghost" onClick={onManage}>Manage</button>}
      </div>
    </div>
  );
}
