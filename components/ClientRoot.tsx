"use client";

import React from "react";
import Header from "./Header";
import CurrencyProvider, { CurrencyProvider as NamedCurrencyProvider } from "./CurrencyContext";
import CatalogProvider,  { CatalogProvider  as NamedCatalogProvider  } from "./catalog";
import CollectionProvider, { CollectionProvider as NamedCollectionProvider } from "./CollectionStore";

/**
 * We export default & named providers in each file.
 * Use the *named* ones here so tree-shaking still works,
 * but having both exports keeps the RSC client manifest happy.
 */
export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <NamedCurrencyProvider>
      <NamedCatalogProvider>
        <NamedCollectionProvider>
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </NamedCollectionProvider>
      </NamedCatalogProvider>
    </NamedCurrencyProvider>
  );
}
