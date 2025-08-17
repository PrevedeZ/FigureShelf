"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Series = { id: string; name: string };

export default function AdminPage() {
  const [role, setRole] = useState<string | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/me", { cache: "no-store" });
      if (!me.ok) { router.push("/login?callbackUrl=/admin"); return; }
      const j = await me.json();
      setRole(j?.user?.role ?? "USER");
      if ((j?.user?.role ?? "USER") !== "ADMIN") { router.push("/"); return; }

      const s = await fetch("/api/admin/series");
      const sj = await s.json();
      setSeries(sj.series ?? []);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return null;
  if (role !== "ADMIN") return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="card p-4">
        <h1 className="text-xl font-semibold mb-2">Admin</h1>
        <div className="text-sm text-gray-600">Create new Series and Figures here.</div>
      </div>

      <CreateSeries onCreated={(s)=>setSeries(prev=>[...prev, s].sort((a,b)=>a.name.localeCompare(b.name)))} />
      <CreateFigure series={series} />
    </div>
  );
}

function CreateSeries({ onCreated }:{ onCreated:(s:Series)=>void }) {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const r = await fetch("/api/admin/series", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ name }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j?.error ?? "Failed"); return; }
    onCreated(j.series);
    setName(""); setMsg("Series created");
    setTimeout(()=>setMsg(null), 2000);
  };
  return (
    <div className="card p-4">
      <h2 className="text-base font-semibold mb-2">Create Series</h2>
      <form className="flex gap-2" onSubmit={submit}>
        <input className="field flex-1" placeholder="Series name (e.g., Dragon Ball)"
               value={name} onChange={e=>setName(e.target.value)} required />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>
      {msg && <div className="mt-2 text-sm text-gray-700">{msg}</div>}
    </div>
  );
}

function CreateFigure({ series }:{ series: Series[] }) {
  const [form, setForm] = useState({
    name:"", character:"", line:"S.H.Figuarts", seriesId:"", seriesName:"",
    releaseYear: new Date().getFullYear(), msrpCents: 6000, msrpCurrency:"JPY",
    image:"/placeholder/goku.jpg", releaseType:"",
  });
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const seriesName = form.seriesId ? (series.find(s=>s.id===form.seriesId)?.name ?? "") : form.seriesName.trim();
    const r = await fetch("/api/admin/figures", {
      method:"POST", headers:{ "content-type":"application/json" },
      body: JSON.stringify({ ...form, seriesName, releaseYear:Number(form.releaseYear), msrpCents:Number(form.msrpCents) })
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j?.error ?? "Failed"); return; }
    setMsg("Figure created");
    setTimeout(()=>setMsg(null), 2000);
  };

  return (
    <div className="card p-4">
      <h2 className="text-base font-semibold mb-2">Create Figure</h2>
      <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={onSubmit}>
        <div><label className="text-xs text-gray-600">Name</label>
          <input className="field" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
        </div>
        <div><label className="text-xs text-gray-600">Character</label>
          <input className="field" value={form.character} onChange={e=>setForm({...form, character:e.target.value})} required />
        </div>
        <div><label className="text-xs text-gray-600">Line</label>
          <input className="field" value={form.line} onChange={e=>setForm({...form, line:e.target.value})} required />
        </div>

        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Choose existing series</label>
            <select className="field" value={form.seriesId} onChange={e=>setForm({...form, seriesId:e.target.value, seriesName:""})}>
              <option value="">—</option>
              {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">…or create new series</label>
            <input className="field" placeholder="New series name"
                   value={form.seriesName} onChange={e=>setForm({...form, seriesName:e.target.value, seriesId:""})} />
          </div>
        </div>

        <div><label className="text-xs text-gray-600">Release year</label>
          <input className="field" type="number" value={form.releaseYear}
                 onChange={e=>setForm({...form, releaseYear: Number(e.target.value)})} required />
        </div>
        <div><label className="text-xs text-gray-600">MSRP (cents)</label>
          <input className="field" type="number" value={form.msrpCents}
                 onChange={e=>setForm({...form, msrpCents: Number(e.target.value)})} required />
        </div>
        <div>
          <label className="text-xs text-gray-600">Currency</label>
          <select className="field" value={form.msrpCurrency} onChange={e=>setForm({...form, msrpCurrency:e.target.value as any})}>
            {["EUR","USD","GBP","JPY"].map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="text-xs text-gray-600">Image URL</label>
          <input className="field" value={form.image} onChange={e=>setForm({...form, image:e.target.value})} required />
        </div>
        <div>
          <label className="text-xs text-gray-600">Release type</label>
          <select className="field" value={form.releaseType} onChange={e=>setForm({...form, releaseType:e.target.value})}>
            <option value="">—</option>
            <option value="general">general</option>
            <option value="exclusive">exclusive</option>
            <option value="event">event</option>
          </select>
        </div>

        <div className="sm:col-span-2 flex justify-end gap-2">
          <button className="btn btn-primary" type="submit">Create figure</button>
        </div>
      </form>
      {msg && <div className="mt-2 text-sm text-gray-700">{msg}</div>}
    </div>
  );
}
