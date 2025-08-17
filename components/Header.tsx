"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useRef, useState } from "react";
import SeriesQuickView from "./SeriesQuickView";

export default function Header() {
  const { data } = useSession();
  const pathname = usePathname();
  const isAdmin = (data?.user as any)?.role === "ADMIN";
  const userEmail = (data?.user as any)?.email as string | undefined;

  const [seriesOpen, setSeriesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const seriesCloseT = useRef<number | null>(null);
  const accountCloseT = useRef<number | null>(null);

  const openSeries = () => {
    if (seriesCloseT.current) window.clearTimeout(seriesCloseT.current);
    setSeriesOpen(true);
  };
  const closeSeries = () => {
    // tiny delay makes it feel less “twitchy” when moving diagonally
    seriesCloseT.current = window.setTimeout(() => setSeriesOpen(false), 120) as unknown as number;
  };

  const openAccount = () => {
    if (accountCloseT.current) window.clearTimeout(accountCloseT.current);
    setAccountOpen(true);
  };
  const closeAccount = () => {
    accountCloseT.current = window.setTimeout(() => setAccountOpen(false), 120) as unknown as number;
  };

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`px-3 py-2 rounded-md text-sm ${
          active ? "bg-[var(--panel)] font-semibold" : "hover:bg-[var(--panel)]"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-3">
        {/* Brand */}
        <Link href="/" className="font-semibold">SHF Catalog</Link>

        {/* Left nav */}
        <nav className="ml-4 flex items-center gap-1 relative">
          <NavLink href="/" label="All Figures" />

          {/* Series link with controlled hover dropdown */}
          <div
            className="relative"
            onMouseEnter={openSeries}
            onMouseLeave={closeSeries}
            onFocus={openSeries}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) closeSeries();
            }}
          >
            <NavLink href="/series" label="Series" />
            <SeriesQuickView open={seriesOpen} />
          </div>
        </nav>

        {/* Right side: My Account */}
        <div className="ml-auto flex items-center gap-2">
          {data?.user ? (
            <div
              className="relative"
              onMouseEnter={openAccount}
              onMouseLeave={closeAccount}
              onFocus={openAccount}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) closeAccount();
              }}
            >
              {/* Trigger */}
              <button
                className="h-9 px-3 rounded-md border border-[var(--border)] bg-white hover:bg-[var(--panel)] text-sm flex items-center gap-2"
                type="button"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
              >
                <Avatar email={userEmail} />
                <span className="hidden sm:inline">{userEmail}</span>
                <span className="text-gray-500">▾</span>
              </button>

              {/* Dropdown */}
              <div
                className={`absolute right-0 mt-2 w-56 rounded-xl border border-[var(--border)] bg-white shadow-card p-2 z-50 ${
                  accountOpen ? "block" : "hidden"
                }`}
                role="menu"
              >
                <Link
                  href="/account"
                  className="block w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 text-sm"
                  role="menuitem"
                >
                  My Data
                </Link>

                {isAdmin && (
                  <button
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 text-sm"
                    onClick={() =>
                      document.dispatchEvent(
                        new CustomEvent("admin:open", { detail: { tab: "catalog" } })
                      )
                    }
                    role="menuitem"
                  >
                    Admin Dock
                  </button>
                )}

                <button
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 text-sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  role="menuitem"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <Link className="btn btn-primary h-9" href="/auth/signin">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Avatar({ email }: { email?: string }) {
  const letter = (email?.trim()?.[0] || "?").toUpperCase();
  return (
    <span className="inline-grid place-items-center w-6 h-6 rounded-full bg-[var(--panel)] border border-[var(--border)] text-[11px] font-semibold">
      {letter}
    </span>
  );
}
