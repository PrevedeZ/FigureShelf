// components/ClientApp.tsx
"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import Header from "./Header";
import { CurrencyProvider } from "./CurrencyContext";
import { CatalogProvider } from "./catalog";
import { CollectionProvider } from "./CollectionStore";

export default function ClientApp({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CurrencyProvider>
        <CatalogProvider>
          <CollectionProvider>
            <Header />
            <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          </CollectionProvider>
        </CatalogProvider>
      </CurrencyProvider>
    </SessionProvider>
  );
}
