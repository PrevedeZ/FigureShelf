"use client";
import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { useSession } from "next-auth/react";

export default function AccountPage() {
  const { data } = useSession();
  const email = (data?.user as any)?.email as string | undefined;

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  useEffect(() => {
    // Fetch current profile (name)
    (async () => {
      const r = await fetch("/api/account/profile", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setName(j?.user?.name || "");
    })();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const r = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!r.ok) { setMsg("Failed to save"); return; }
    setMsg("Saved");
    setTimeout(() => setMsg(null), 1500);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChanging(true); setPwdMsg(null);
    const r = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setChanging(false);
    const j = await r.json().catch(() => null);
    if (!r.ok) { setPwdMsg(j?.error || "Password change failed"); return; }
    setPwdMsg("Password updated");
    setCurrentPassword(""); setNewPassword("");
    setTimeout(() => setPwdMsg(null), 2000);
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <h1 className="text-xl font-semibold">My Data</h1>

        <section className="card p-4 space-y-4">
          <div className="text-sm text-gray-600">Profile</div>
          <form onSubmit={saveProfile} className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-gray-600">Email</label>
              <input className="field h-11 text-base" value={email || ""} readOnly />
            </div>
            <div>
              <label className="text-xs text-gray-600">Display name</label>
              <input
                className="field h-11 text-base"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="flex justify-end">
              <button className="btn btn-primary h-11" disabled={saving} type="submit">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            {msg && <div className="text-sm text-gray-700">{msg}</div>}
          </form>
        </section>

        <section className="card p-4 space-y-4">
          <div className="text-sm text-gray-600">Change password</div>
          <form onSubmit={changePassword} className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-gray-600">Current password</label>
              <input
                type="password"
                className="field h-11 text-base"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                minLength={1}
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">New password (min 8)</label>
              <input
                type="password"
                className="field h-11 text-base"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="flex justify-end">
              <button className="btn btn-primary h-11" disabled={changing} type="submit">
                {changing ? "Updating…" : "Update password"}
              </button>
            </div>
            {pwdMsg && <div className="text-sm text-gray-700">{pwdMsg}</div>}
          </form>
        </section>
      </main>
    </>
  );
}
