// components/AdminDockClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "./catalog";
import { formatCents, useCurrency } from "./CurrencyContext";

type Series = { id: string; name: string; slug?: string; createdAt?: string; _count?: { figures: number } };
type Figure = {
  id: string; seriesId: string;
  name: string; character: string; characterBase?: string | null; variant?: string | null;
  line: string; image: string; releaseYear: number; releaseType?: string | null;
  msrpCents: number; msrpCurrency: "EUR"|"USD"|"GBP"|"JPY";
  bodyVersionTag?: string | null; bodyVersion?: string | null; saga?: string | null;
};
type UserRow = { id: string; email: string; name?: string | null; role: "USER"|"ADMIN"; createdAt: string; owned: number; wishlist: number; };
type CollectionUser = { userId: string; email: string; name?: string | null; ownedCopies: number; ownedUnique: number; spendCentsEUR: number; };

function TabButton({active, onClick, children}:{active:boolean; onClick:()=>void; children:React.ReactNode}) {
  return (
    <button className={`px-3 py-2 rounded-md text-sm ${active ? "bg-gray-200" : "hover:bg-gray-100"}`} onClick={onClick}>
      {children}
    </button>
  );
}

export default function AdminDockClient() {
  const [tab, setTab] = useState<"series"|"figures"|"users"|"collection">("series");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Dock</h1>

      <div className="rounded-lg border border-[var(--border)] p-1 w-fit">
        <TabButton active={tab==="series"} onClick={()=>setTab("series")}>Series</TabButton>
        <TabButton active={tab==="figures"} onClick={()=>setTab("figures")}>Figures</TabButton>
        <TabButton active={tab==="users"} onClick={()=>setTab("users")}>Users</TabButton>
        <TabButton active={tab==="collection"} onClick={()=>setTab("collection")}>Collection Overview</TabButton>
      </div>

      {tab==="series" && <SeriesAdmin />}
      {tab==="figures" && <FiguresAdmin />}
      {tab==="users" && <UsersAdmin />}
      {tab==="collection" && <CollectionAdmin />}
    </div>
  );
}

/* ------------------ SERIES ------------------ */
function SeriesAdmin() {
  const [list, setList] = useState<Series[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const load = async () => {
    const r = await fetch("/api/admin/series", { cache: "no-store", credentials: "include" });
    const j = await r.json();
    setList(Array.isArray(j?.series) ? j.series : []);
  };

  useEffect(() => { load(); }, []);

  async function createSeries(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/series", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      credentials: "include",
      body: JSON.stringify({ name, slug: slug || undefined }),
    });
    if (!r.ok) return alert("Failed to create series.");
    setName(""); setSlug("");
    document.dispatchEvent(new CustomEvent("catalog:changed"));
    load();
  }

  async function rename(id:string, newName:string) {
    const r = await fetch(`/api/admin/series/${id}`, {
      method: "PATCH",
      headers: { "Content-Type":"application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newName }),
    });
    if (!r.ok) return alert("Rename failed.");
    document.dispatchEvent(new CustomEvent("catalog:changed"));
    load();
  }

  async function remove(id:string) {
    if (!confirm("Delete this series? Only allowed when it has no figures.")) return;
    const r = await fetch(`/api/admin/series/${id}`, { method: "DELETE", credentials: "include" });
    const j = await r.json().catch(()=>null);
    if (!r.ok) return alert(j?.error ?? "Delete failed");
    document.dispatchEvent(new CustomEvent("catalog:changed"));
    load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={createSeries} className="card p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
        <input className="field" placeholder="Series name" value={name} onChange={e=>setName(e.target.value)} required />
        <input className="field" placeholder="Slug (optional)" value={slug} onChange={e=>setSlug(e.target.value)} />
        <button className="btn btn-primary">Add Series</button>
      </form>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Slug</th>
              <th className="p-2 text-left">Figures</th>
              <th className="p-2 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id} className="border-t">
                <td className="p-2">
                  <InlineEdit value={s.name} onSave={(v)=>rename(s.id, v)} />
                </td>
                <td className="p-2">{s.slug ?? ""}</td>
                <td className="p-2">{s._count?.figures ?? 0}</td>
                <td className="p-2">
                  <button className="btn btn-ghost" onClick={()=>remove(s.id)} disabled={(s._count?.figures ?? 0) > 0}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {list.length===0 && (<tr><td className="p-4 text-center text-gray-600" colSpan={4}>No series yet.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------ FIGURES ------------------ */
function FiguresAdmin() {
  const { series, figures } = useCatalog();
  const [form, setForm] = useState<Partial<Figure>>({
    name: "", character: "", line: "", image: "", releaseYear: new Date().getFullYear(),
    msrpCents: 0, msrpCurrency: "EUR", seriesId: "",
  });

  const [list, setList] = useState<Figure[]>([]);
  const [filterSeries, setFilterSeries] = useState<string>("");

  const load = async () => {
    const url = filterSeries ? `/api/admin/figures?seriesId=${encodeURIComponent(filterSeries)}` : "/api/admin/figures";
    const r = await fetch(url, { cache: "no-store", credentials: "include" });
    const j = await r.json();
    setList(Array.isArray(j?.figures) ? j.figures : []);
  };
  useEffect(() => { load(); }, [filterSeries]);

  async function createFigure(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/figures", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const j = await r.json().catch(()=>null);
    if (!r.ok) return alert(j?.error ?? "Failed to create figure.");
    setForm({
      name: "", character: "", characterBase: "", variant: "", line: "", image: "",
      releaseYear: new Date().getFullYear(), msrpCents: 0, msrpCurrency: "EUR", seriesId: "",
      bodyVersionTag: "", bodyVersion: undefined, saga: ""
    });
    document.dispatchEvent(new CustomEvent("catalog:changed"));
    load();
  }

  async function removeFigure(id: string) {
    if (!confirm("Delete this figure? Blocked if it has owned/wishlist references.")) return;
    const r = await fetch(`/api/admin/figures/${id}`, { method: "DELETE", credentials: "include" });
    const j = await r.json().catch(()=>null);
    if (!r.ok) return alert(j?.error ?? "Delete failed");
    document.dispatchEvent(new CustomEvent("catalog:changed"));
    load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={createFigure} className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select className="field" value={form.seriesId || ""} onChange={e=>setForm(f=>({...f, seriesId: e.target.value}))} required>
          <option value="">Select series…</option>
          {series.map(s => <option key={s} value={findSeriesId(series, s)}>{s}</option>)}
        </select>
        <input className="field" placeholder="Name" value={form.name || ""} onChange={e=>setForm(f=>({...f, name: e.target.value}))} required />
        <input className="field" placeholder="Character (raw)" value={form.character || ""} onChange={e=>setForm(f=>({...f, character: e.target.value}))} />
        <input className="field" placeholder="Character Base" value={form.characterBase || ""} onChange={e=>setForm(f=>({...f, characterBase: e.target.value}))} />
        <input className="field" placeholder="Variant" value={form.variant || ""} onChange={e=>setForm(f=>({...f, variant: e.target.value}))} />
        <input className="field" placeholder="Line" value={form.line || ""} onChange={e=>setForm(f=>({...f, line: e.target.value}))} />
        <input className="field" placeholder="Image URL" value={form.image || ""} onChange={e=>setForm(f=>({...f, image: e.target.value}))} required />
        <input className="field" type="number" placeholder="Release Year" value={form.releaseYear ?? ""} onChange={e=>setForm(f=>({...f, releaseYear: Number(e.target.value)||undefined}))} />
        <select className="field" value={form.releaseType ?? ""} onChange={e=>setForm(f=>({...f, releaseType: e.target.value||undefined}))}>
          <option value="">Release Type (optional)</option>
          <option value="retail">retail</option>
          <option value="web_exclusive">web_exclusive</option>
          <option value="event_exclusive">event_exclusive</option>
          <option value="sdcc">sdcc</option>
          <option value="reissue">reissue</option>
          <option value="unknown">unknown</option>
        </select>
        <input className="field" type="number" placeholder="MSRP cents" value={form.msrpCents ?? ""} onChange={e=>setForm(f=>({...f, msrpCents: Number(e.target.value)||0}))} />
        <select className="field" value={form.msrpCurrency || "EUR"} onChange={e=>setForm(f=>({...f, msrpCurrency: e.target.value as any}))}>
          {["EUR","USD","GBP","JPY"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="field" placeholder="Body Version Tag (e.g., 2.0)" value={form.bodyVersionTag || ""} onChange={e=>setForm(f=>({...f, bodyVersionTag: e.target.value}))} />
        <select className="field" value={form.bodyVersion ?? ""} onChange={e=>setForm(f=>({...f, bodyVersion: e.target.value||undefined}))}>
          <option value="">Body Version (coarse)</option>
          <option value="V1_0">V1_0</option>
          <option value="V2_0">V2_0</option>
          <option value="V3_0">V3_0</option>
          <option value="OTHER">OTHER</option>
        </select>
        <input className="field" placeholder="Saga (optional)" value={form.saga || ""} onChange={e=>setForm(f=>({...f, saga: e.target.value}))} />
        <button className="btn btn-primary">Add Figure</button>
      </form>

      <div className="card p-3">
        <div className="flex items-center gap-2 mb-3">
          <select className="field" value={filterSeries} onChange={e=>setFilterSeries(e.target.value)}>
            <option value="">All series</option>
            {series.map(s => <option key={s} value={findSeriesId(series, s)}>{s}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map(f => (
            <div key={f.id} className="card p-3 space-y-1">
              <div className="text-sm text-gray-600">{f.seriesId}</div>
              <div className="font-semibold">{f.name}</div>
              <div className="text-sm">{f.characterBase ?? f.character}{f.variant ? ` (${f.variant})`:""} · {f.releaseYear}</div>
              <div className="text-sm">{f.line} · {f.msrpCurrency} {(f.msrpCents/100).toFixed(2)}</div>
              <div className="pt-2">
                <button className="btn btn-ghost" onClick={()=>removeFigure(f.id)}>Delete</button>
              </div>
            </div>
          ))}
          {list.length===0 && <div className="text-center text-gray-600 py-6">No figures found.</div>}
        </div>
      </div>
    </div>
  );
}

function findSeriesId(seriesNames:string[], seriesName:string): string {
  // Admin APIs use real seriesId. If your Catalog provider exposes name->id map, swap this implementation.
  // Temporary: ask server list when creating, so here we just pass name (API will resolve if needed).
  return seriesName; // server resolves when not a valid cuid
}

/* ------------------ USERS ------------------ */
function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);

  const load = async () => {
    const r = await fetch("/api/admin/users", { cache:"no-store", credentials:"include" });
    const j = await r.json();
    setUsers(Array.isArray(j?.users) ? j.users : []);
  };
  useEffect(() => { load(); }, []);

  async function changeRole(id:string, role:"USER"|"ADMIN") {
    const r = await fetch(`/api/admin/users/${id}`, {
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      credentials:"include",
      body: JSON.stringify({ role }),
    });
    if (!r.ok) return alert("Failed to change role.");
    load();
  }

  async function resetPassword(id:string) {
    const pw = prompt("New password for this user:");
    if (!pw) return;
    const r = await fetch(`/api/admin/users/${id}`, {
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      credentials:"include",
      body: JSON.stringify({ password: pw }),
    });
    const j = await r.json().catch(()=>null);
    if (!r.ok) return alert(j?.error ?? "Password reset failed.");
    alert("Password updated.");
    load();
  }

  return (
    <div className="card p-0 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Role</th>
            <th className="p-2 text-left">Owned</th>
            <th className="p-2 text-left">Wishlist</th>
            <th className="p-2 w-64">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-t">
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.name ?? ""}</td>
              <td className="p-2">
                <select className="field h-9" value={u.role} onChange={e=>changeRole(u.id, e.target.value as any)}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>
              <td className="p-2">{u.owned}</td>
              <td className="p-2">{u.wishlist}</td>
              <td className="p-2">
                <button className="btn btn-ghost" onClick={()=>resetPassword(u.id)}>Reset Password</button>
              </td>
            </tr>
          ))}
          {users.length===0 && (<tr><td className="p-4 text-center text-gray-600" colSpan={6}>No users.</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------ COLLECTION OVERVIEW ------------------ */
function CollectionAdmin() {
  const [rows, setRows] = useState<CollectionUser[]>([]);
  const { format } = useFormatEUR();

  const load = async () => {
    const r = await fetch("/api/admin/collection", { cache:"no-store", credentials:"include" });
    const j = await r.json();
    setRows(Array.isArray(j?.rows) ? j.rows : []);
  };
  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    let copies=0, unique=0, spend=0;
    for (const r of rows) { copies+=r.ownedCopies; unique+=r.ownedUnique; spend+=r.spendCentsEUR; }
    return { copies, unique, spend };
  }, [rows]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3"><div className="text-[11px] uppercase">Owned (copies)</div><div className="text-2xl font-semibold">{totals.copies}</div></div>
        <div className="card p-3"><div className="text-[11px] uppercase">Owned (unique)</div><div className="text-2xl font-semibold">{totals.unique}</div></div>
        <div className="card p-3"><div className="text-[11px] uppercase">Spend (EUR)</div><div className="text-2xl font-semibold">{format(totals.spend)}</div></div>
      </div>
      <div className="card p-0 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Owned (copies)</th>
              <th className="p-2 text-left">Owned (unique)</th>
              <th className="p-2 text-left">Spend EUR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.userId} className="border-t">
                <td className="p-2">{r.email}{r.name ? ` · ${r.name}` : ""}</td>
                <td className="p-2">{r.ownedCopies}</td>
                <td className="p-2">{r.ownedUnique}</td>
                <td className="p-2">{format(r.spendCentsEUR)}</td>
              </tr>
            ))}
            {rows.length===0 && (<tr><td className="p-4 text-center text-gray-600" colSpan={4}>No data.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InlineEdit({ value, onSave }:{ value:string; onSave:(v:string)=>void }) {
  const [v, setV] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(()=>setV(value), [value]);
  return editing ? (
    <div className="flex items-center gap-2">
      <input className="field h-9" value={v} onChange={e=>setV(e.target.value)} />
      <button className="btn btn-primary h-9" onClick={()=>{ onSave(v); setEditing(false); }}>Save</button>
      <button className="btn btn-ghost h-9" onClick={()=>{ setV(value); setEditing(false); }}>Cancel</button>
    </div>
  ) : (
    <button className="btn btn-ghost h-9" onClick={()=>setEditing(true)}>{value}</button>
  );
}

function useFormatEUR() {
  return {
    format: (cents:number) => (cents/100).toFixed(2),
  };
}
