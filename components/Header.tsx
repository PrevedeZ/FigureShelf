"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const cancelClose = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    timerRef.current = window.setTimeout(() => setOpen(false), 150);
  };

  // Close on ESC + click outside
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDocMouseDown = (e: MouseEvent) => {
      if (!open) return;
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDocMouseDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocMouseDown);
      cancelClose(); // cleanup any pending timer
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-block h-3 w-3 rounded-full bg-[var(--accent)]" />
          FigureShelf
        </Link>

        {/* Nav */}
        <nav className="ml-6 hidden sm:flex items-center gap-4 text-sm">
          <Link className="hover:underline" href="/">All Figures</Link>
          <Link className="hover:underline" href="/series">Series</Link>
        </nav>

        <div className="ml-auto" />

        {/* Account dropdown */}
        <div
          ref={wrapRef}
          className="relative"
          onMouseEnter={() => { cancelClose(); setOpen(true); }}
          onMouseLeave={scheduleClose}
        >
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)} // click/touch toggle
            className="h-9 px-3 rounded-md border border-[var(--border)] bg-white hover:bg-gray-50 text-sm"
          >
            {session?.user?.email ?? "My Account"}
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-48 rounded-lg border border-[var(--border)] bg-white shadow-lg z-50 p-1"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              {session ? (
                <>
                  <Link
                    role="menuitem"
                    href="/account"
                    className="block px-3 py-2 rounded-md hover:bg-gray-50 text-sm"
                    onClick={() => setOpen(false)}
                  >
                    Account
                  </Link>
                  {isAdmin && (
                    <Link
                      role="menuitem"
                      href="/admin"
                      className="block px-3 py-2 rounded-md hover:bg-gray-50 text-sm"
                      onClick={() => setOpen(false)}
                    >
                      Admin Dock
                    </Link>
                  )}
                  <button
                    role="menuitem"
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 text-sm"
                    onClick={() => { setOpen(false); signOut(); }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <button
                    role="menuitem"
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 text-sm"
                    onClick={() => { setOpen(false); signIn(); }}
                  >
                    Sign in
                  </button>
                  <Link
                    role="menuitem"
                    href="/register"
                    className="block px-3 py-2 rounded-md hover:bg-gray-50 text-sm"
                    onClick={() => setOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
