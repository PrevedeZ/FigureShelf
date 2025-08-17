"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { Figure } from "./types";

/* ---------------- Types ---------------- */
type Series = { id: string; name: string };
type User = { id: string; email: string; name: string | null; role: "USER" | "ADMIN"; createdAt: string };
type Tab = "series" | "figure" | "catalog" | "users";

/* ---------------- Component ---------------- */
export default function AdminDock() {
  const { data } = useSession();
  const isAdmin = (data?.user as any)?.role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("catalog");

  useEffect(() => {
    if (!isAdmin) return;
    const onOpen = (e: Event) => {
      const t = (e as CustomEvent)?.detail?.tab as Tab | undefined;
      if (t) setTab(t);
      setOpen(true);
    };
    document.addEventListener("admin:open", onOpen as EventListener);
    return () => document.removeEventListener("admin:open", onOpen as EventListener);
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <>
      {!open && (
        <div className="fixed bottom-4 right-4 z-50">
          <button className="btn btn-primary shadow-card" onClick={() => setOpen(true)}>AdminDock</button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-2 sm:inset-4">
            <div className="card p-0 h-full flex flex-col overflow-hidden">
              {/* Top bar */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border)] bg-[var(--panel)] sticky top-0 z-20">
                <div className="text-lg font-semibold">AdminDock</div>
                <button className="btn btn-ghost" onClick={() => setOpen(false)} aria-label="Close">✕</button>
              </div>

              {/* Tabs */}
              <TabBar tab={tab} onChange={setTab} />

              {/* Content */}
              <div className="flex-1 overflow-auto p-4">
                <div className="mx-auto w-full max-w-7xl">
                  {tab === "series"  && <SeriesManager />}
                  {tab === "figure"  && <AddFigure />}
                  {tab === "catalog" && <CatalogEditor />}
                  {tab === "users"   && <ManageUsers />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const Item = ({ id, label }: { id: Tab; label: string }) => (
    <button
      role="tab"
      aria-selected={tab === id}
      className={`px-5 py-3 text-base border-b-2 -mb-px ${
        tab === id
          ? "border-[var(--accent)] font-semibold"
          : "border-transparent text-gray-600 hover:text-gray-900"
      }`}
      onClick={() => onChange(id)}
    >
      {label}
    </button>
  );
  return (
    <div
      role="tablist"
      className="px-3 sm:px-5 flex items-end gap-3 border-b border-[var(--border)] bg-[var(--panel)] sticky top-[65px] z-10"
    >
      <Item id="series"  label="Series" />
      <Item id="figure"  label="Add Figure" />
      <Item id="catalog" label="Catalog" />
      <Item id="users"   label="Users" />
    </div>
  );
}

/* ---------------- Series Manager (list + add + rename + delete) ---------------- */
function SeriesManager() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/series", { cache: "no-store" });
    const j = await r.json();
    setSeries(j.series ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const refresh = async () => { document.dispatchEvent(new Event("catalog:refresh")); await load(); };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/admin/series", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) { setMsg("Failed to create"); return; }
    setName(""); setMsg("Created");
    setTimeout(() => setMsg(null), 1200);
    await refresh();
  };

  const rename = async (id: string, newName: string) => {
    const r = await fetch(`/api/admin/series/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!r.ok) { setMsg("Rename failed"); return; }
    await refresh();
  };

  const remove = async (id: string) => {
    const r = await fetch(`/api/admin/series/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json().catch(() => null);
      const reason = j?.error || "Delete failed";
      setMsg(reason + '. Use "force delete" to remove series and its figures.');
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    await refresh();
  };

  const forceRemove = async (id: string) => {
    const r = await fetch(`/api/admin/series/${id}?force=true`, { method: "DELETE" });
    if (!r.ok) { setMsg("Force delete failed"); setTimeout(()=>setMsg(null), 2000); return; }
    await refresh();
  };

  return (
    <div className="space-y-5">
      <div className="text-base font-medium">Series</div>
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <input
          className="field h-11 text-base"
          placeholder="New series name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button className="btn btn-primary h-11" type="submit">Add</button>
      </form>
      {msg && <div className="text-sm text-gray-700">{msg}</div>}

      {loading ? (
        <div className="text-base text-gray-600">Loading…</div>
      ) : (
        <div className="space-y-3">
          {series.map((s) => (
            <SeriesRow
              key={s.id}
              s={s}
              onRename={(n) => rename(s.id, n)}
              onDelete={() => remove(s.id)}
              onForceDelete={() => forceRemove(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
function SeriesRow({
  s, onRename, onDelete, onForceDelete,
}: { s: Series; onRename: (n: string) => void; onDelete: () => void; onForceDelete: () => void; }) {
  const [name, setName] = useState(s.name);
  return (
    <div className="card p-4 flex items-center gap-3">
      <input className="field h-11 text-base w-[28rem] max-w-full" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="ml-auto flex gap-2">
        <button className="btn btn-ghost h-10" onClick={() => onRename(name)}>Save</button>
        <button className="btn btn-ghost h-10" onClick={onDelete}>Delete</button>
        <button className="btn btn-ghost h-10" onClick={onForceDelete}>Force delete</button>
      </div>
    </div>
  );
}

/* ---------------- Add Figure ---------------- */
function AddFigure() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", character: "", characterBase: "", variant: "",
    line: "S.H.Figuarts", image: "/placeholder/goku.jpg",
    releaseYear: new Date().getFullYear(), releaseType: "",
    bodyVersion: "", saga: "",
    seriesId: "", seriesName: "",
    msrpCents: 6000, msrpCurrency: "JPY",
  });

  useEffect(() => { (async () => {
    const r = await fetch("/api/admin/series"); const j = await r.json();
    setSeries(j.series ?? []); setLoading(false);
  })(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    const seriesName = form.seriesId ? (series.find(s=>s.id===form.seriesId)?.name ?? "") : form.seriesName.trim();
    const r = await fetch("/api/admin/figures", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, seriesName, releaseYear: Number(form.releaseYear), msrpCents: Number(form.msrpCents) }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j?.error ?? "Failed"); return; }
    setMsg("Figure created"); document.dispatchEvent(new Event("catalog:refresh"));
    setForm({ ...form, name:"", character:"", characterBase:"", variant:"", seriesId:"", seriesName:"" });
    setTimeout(()=>setMsg(null), 1500);
  };

  if (loading) return <div className="text-base text-gray-600">Loading series…</div>;

  const field = "field h-11 text-base";
  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2 text-base font-medium">Add a figure</div>

      <div><label className="text-xs text-gray-600">Name</label>
        <input className={field} value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required /></div>

      <div><label className="text-xs text-gray-600">Character (full)</label>
        <input className={field} value={form.character} onChange={e=>setForm({...form, character:e.target.value})} required /></div>

      <div><label className="text-xs text-gray-600">Character Base</label>
        <input className={field} value={form.characterBase} onChange={e=>setForm({...form, characterBase:e.target.value})} /></div>

      <div><label className="text-xs text-gray-600">Variant</label>
        <input className={field} value={form.variant} onChange={e=>setForm({...form, variant:e.target.value})} /></div>

      <div><label className="text-xs text-gray-600">Line</label>
        <input className={field} value={form.line} onChange={e=>setForm({...form, line:e.target.value})} required /></div>

      <div><label className="text-xs text-gray-600">Release Year</label>
        <input className={field} type="number" value={form.releaseYear} onChange={e=>setForm({...form, releaseYear:Number(e.target.value)})} required /></div>

      <div><label className="text-xs text-gray-600">Release Type</label>
        <select className={field} value={form.releaseType} onChange={e=>setForm({...form, releaseType:e.target.value})}>
          <option value="">—</option>
          <option value="retail">retail</option>
          <option value="tamashii_web">tamashii_web</option>
          <option value="event_exclusive">event_exclusive</option>
          <option value="sdcc">sdcc</option>
        </select></div>

      <div><label className="text-xs text-gray-600">Body Version</label>
        <select className={field} value={form.bodyVersion} onChange={e=>setForm({...form, bodyVersion:e.target.value})}>
          <option value="">—</option>
          <option value="V1.0">V1.0</option>
          <option value="V2.0">V2.0</option>
          <option value="V3.0">V3.0</option>
          <option value="Other">Other</option>
        </select></div>

      <div className="md:col-span-2"><label className="text-xs text-gray-600">Saga</label>
        <input className={field} value={form.saga} onChange={e=>setForm({...form, saga:e.target.value})} /></div>

      <div className="md:col-span-2"><label className="text-xs text-gray-600">Image URL</label>
        <input className={field} value={form.image} onChange={e=>setForm({...form, image:e.target.value})} required /></div>

      <div><label className="text-xs text-gray-600">MSRP (cents)</label>
        <input className={field} type="number" value={form.msrpCents} onChange={e=>setForm({...form, msrpCents:Number(e.target.value)})} required /></div>
      <div><label className="text-xs text-gray-600">MSRP Currency</label>
        <select className={field} value={form.msrpCurrency} onChange={e=>setForm({...form, msrpCurrency:e.target.value})}>
          {["EUR","USD","GBP","JPY"].map(c=> <option key={c} value={c}>{c}</option>)}
        </select></div>

      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-xs text-gray-600">Choose existing series</label>
          <select className={field} value={form.seriesId} onChange={e=>setForm({...form, seriesId:e.target.value, seriesName:""})}>
            <option value="">—</option>
            {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div><label className="text-xs text-gray-600">…or create new series</label>
          <input className={field} placeholder="New series name" value={form.seriesName} onChange={e=>setForm({...form, seriesName:e.target.value, seriesId:""})} /></div>
      </div>

      <div className="md:col-span-2 flex justify-end">
        <button className="btn btn-primary h-11" type="submit">Create</button>
      </div>
      {msg && <div className="md:col-span-2 text-sm text-gray-700">{msg}</div>}
    </form>
  );
}

/* ---------------- Catalog Editor (group by series, dropdown, stacked cards) ---------------- */
function CatalogEditor() {
  const [figures, setFigures] = useState<Figure[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    const r = await fetch("/api/catalog", { cache: "no-store" }); const j = await r.json();
    setFigures(j.figures ?? []);
  };
  useEffect(() => { load(); }, []);
  const refresh = async () => { document.dispatchEvent(new Event("catalog:refresh")); await load(); };

  const save = async (id: string, patch: Partial<Figure>) => {
    setSaving(id);
    const r = await fetch(`/api/admin/figures/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    setSaving(null);
    if (r.ok) await refresh();
  };
  const remove = async (id: string) => {
    setDeleting(id);
    const r = await fetch(`/api/admin/figures/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (r.ok) await refresh();
  };

  // Build groups: series -> sorted figures filtered by query
  const groups = useMemo(() => {
    const list = (figures ?? []).filter(f => {
      if (!q.trim()) return true;
      const hay = `${f.series} ${f.name} ${f.character} ${f.characterBase ?? ""} ${f.variant ?? ""} ${f.saga ?? ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
    const bySeries = new Map<string, Figure[]>();
    for (const f of list) {
      if (!bySeries.has(f.series)) bySeries.set(f.series, []);
      bySeries.get(f.series)!.push(f);
    }
    for (const arr of bySeries.values()) arr.sort((a,b)=> a.name.localeCompare(b.name));
    return [...bySeries.entries()].sort((a,b)=> a[0].localeCompare(b[0]));
  }, [figures, q]);

  // Expand/collapse controls
  useEffect(() => {
    // default: expand all when groups change (user can collapse after)
    setExpanded((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const [s] of groups) if (!(s in next)) next[s] = true;
      return next;
    });
  }, [groups]);

  const setAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    for (const [s] of groups) next[s] = open;
    setExpanded(next);
  };

  if (!figures) return <div className="text-base text-gray-600">Loading catalog…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="field h-11 text-base w-full sm:w-96"
          placeholder="Search by series, name, base, variant, saga…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
        <div className="ml-auto flex gap-2">
          <button className="btn btn-ghost h-10" onClick={()=>setAll(true)}>Expand all</button>
          <button className="btn btn-ghost h-10" onClick={()=>setAll(false)}>Collapse all</button>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="card p-6 text-center text-gray-600">No figures match your search.</div>
      )}

      <div className="space-y-4">
        {groups.map(([series, rows]) => {
          const open = !!expanded[series];
          return (
            <div key={series} className="card p-0 overflow-hidden">
              <button
                className="w-full px-4 py-3 flex items-center justify-between bg-[var(--panel)] border-b border-[var(--border)]"
                onClick={()=>setExpanded(e=>({ ...e, [series]: !open }))}
                aria-expanded={open}
              >
                <div className="font-medium text-base">
                  {series} <span className="text-gray-500 font-normal">· {rows.length} figure{rows.length!==1?"s":""}</span>
                </div>
                <span className="text-gray-500">{open ? "▾" : "▸"}</span>
              </button>

              {open && (
                <div className="p-3 sm:p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {rows.map((f) => (
                      <FigureEditorCard
                        key={f.id}
                        f={f}
                        saving={saving===f.id}
                        deleting={deleting===f.id}
                        onSave={(patch)=>save(f.id, patch)}
                        onDelete={()=>remove(f.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FigureEditorCard({
  f, saving, deleting, onSave, onDelete,
}:{
  f: Figure;
  saving: boolean;
  deleting: boolean;
  onSave: (patch: Partial<Figure>) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Partial<Figure>>({});
  const set = (k: keyof Figure) => (e: any) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const field = "field h-10 text-base";

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="text-sm text-gray-600">{f.series}</div>
      <div className="font-medium">{f.name}</div>

      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Name</label>
            <input className={field} defaultValue={f.name} onChange={set("name")} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Release Year</label>
            <input className={field} type="number" defaultValue={f.releaseYear} onChange={set("releaseYear")} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Character Base</label>
            <input className={field} defaultValue={f.characterBase ?? ""} onChange={set("characterBase")} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Variant</label>
            <input className={field} defaultValue={f.variant ?? ""} onChange={set("variant")} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Release Type</label>
            <select className={field} defaultValue={f.releaseType ?? ""} onChange={set("releaseType")}>
              <option value="">—</option>
              <option value="retail">retail</option>
              <option value="tamashii_web">tamashii_web</option>
              <option value="event_exclusive">event_exclusive</option>
              <option value="sdcc">sdcc</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Body Version</label>
            <select className={field} defaultValue={f.bodyVersion ?? ""} onChange={set("bodyVersion")}>
              <option value="">—</option>
              <option value="V1.0">V1.0</option>
              <option value="V2.0">V2.0</option>
              <option value="V3.0">V3.0</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600">Saga</label>
          <input className={field} defaultValue={f.saga ?? ""} onChange={set("saga")} />
        </div>

        <div>
          <label className="text-xs text-gray-600">Image URL</label>
          <input className={field} defaultValue={f.image} onChange={set("image")} />
        </div>
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <button className="btn btn-ghost h-10" disabled={saving} onClick={() => onSave(draft)}>{saving ? "…" : "Save"}</button>
        <button className="btn btn-ghost h-10" disabled={deleting} onClick={onDelete}>{deleting ? "…" : "Delete"}</button>
      </div>
    </div>
  );
}

/* ---------------- Users (role/password + delete) ---------------- */
function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { (async () => {
    const r = await fetch("/api/admin/users", { cache: "no-store" }); const j = await r.json();
    setUsers(j.users ?? []); setLoading(false);
  })(); }, []);

  const updateRole = async (id: string, role: "USER" | "ADMIN") => {
    setSaving(id);
    const r = await fetch(`/api/admin/users/${id}/role`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) });
    setSaving(null);
    if (!r.ok) { setMsg("Failed to change role"); return; }
    setUsers(list => list.map(u => u.id === id ? { ...u, role } : u));
    setMsg("Role updated"); setTimeout(()=>setMsg(null), 1500);
  };
  const resetPassword = async (id: string, newPassword: string) => {
    if (newPassword.length < 8) { setMsg("Password must be at least 8 characters"); return; }
    setSaving(id);
    const r = await fetch(`/api/admin/users/${id}/password`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ newPassword }) });
    setSaving(null);
    if (!r.ok) { setMsg("Failed to set password"); return; }
    setMsg("Password updated"); setTimeout(()=>setMsg(null), 1500);
  };
  const remove = async (id: string) => {
    setDeleting(id);
    const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (!r.ok) {
      const j = await r.json().catch(()=>null);
      setMsg(j?.error || "Delete failed"); setTimeout(()=>setMsg(null), 2000);
      return;
    }
    setUsers(list => list.filter(u => u.id !== id));
  };

  if (loading) return <div className="text-base text-gray-600">Loading users…</div>;

  const field = "field h-10 text-base";

  return (
    <div className="space-y-4">
      <div className="text-base text-gray-700">Change roles, set passwords, or delete users.</div>
      <div className="space-y-3">
        {users.map(u => (
          <div key={u.id} className="card p-4 flex items-center gap-3">
            <div className="min-w-[260px]">{u.email}</div>
            <div className="min-w-[160px] text-gray-600">{u.name ?? "—"}</div>
            <select className={`${field} w-[9rem]`} value={u.role} onChange={e=>updateRole(u.id, e.target.value as "USER"|"ADMIN")}>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <input className={`${field} w-[14rem]`} type="password" placeholder="New password (min 8)" onBlur={(e)=>{ if (e.target.value.length>=8) resetPassword(u.id, e.target.value); }} />
            <div className="ml-auto flex gap-2">
              <button className="btn btn-ghost h-10" disabled={saving===u.id} onClick={()=>{ /* role saved on change */ }}>{saving===u.id ? "…" : "Saved"}</button>
              <button className="btn btn-ghost h-10" disabled={deleting===u.id} onClick={()=>remove(u.id)}>{deleting===u.id ? "…" : "Delete"}</button>
            </div>
          </div>
        ))}
      </div>
      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </div>
  );
}
