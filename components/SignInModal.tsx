"use client";
import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function SignInModal() {
  const { isOpen, close, signIn } = useAuth();
  const [email, setEmail] = useState("");
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative z-10 w-full max-w-md card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Sign in</h3>
          <button className="btn btn-ghost" onClick={close}>✕</button>
        </div>
        <form onSubmit={(e)=>{e.preventDefault(); if (email) signIn(email)}}
              className="space-y-3">
          <input className="field" value={email} onChange={(e)=>setEmail(e.target.value)}
                 placeholder="you@example.com" type="email" required />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
            <button type="submit" className="btn btn-primary">Continue</button>
          </div>
        </form>
        <p className="text-xs mt-2 text-gray-600">Prototype sign-in only. Stored locally in your browser.</p>
      </div>
    </div>
  );
}
