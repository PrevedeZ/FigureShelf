"use client";
import React, {createContext, useContext, useEffect, useState} from "react";

type User = { email: string; handle: string } | null;
type Ctx = {
  user: User;
  signIn: (email: string) => void;
  signOut: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};
const LS_KEY = "figures.auth.user";
const Ctx = createContext<Ctx | null>(null);

export function AuthProvider({children}:{children:React.ReactNode}) {
  const [user, setUser] = useState<User>(null);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) setUser(JSON.parse(raw)); } catch {}
  }, []);

  const signIn = (email: string) => {
    const u = { email, handle: email.split("@")[0] };
    setUser(u);
    try { localStorage.setItem(LS_KEY, JSON.stringify(u)); } catch {}
    setOpen(false);
  };
  const signOut = () => {
    setUser(null);
    try { localStorage.removeItem(LS_KEY); } catch {}
  };

  return (
    <Ctx.Provider value={{ user, signIn, signOut, isOpen, open:()=>setOpen(true), close:()=>setOpen(false) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
