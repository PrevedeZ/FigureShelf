"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import CurrencyProvider from "./CurrencyContext";
import CatalogProvider from "./catalog";
import CollectionProvider from "./CollectionStore";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CurrencyProvider>
        <CatalogProvider>
          <CollectionProvider>
            {children}
          </CollectionProvider>
        </CatalogProvider>
      </CurrencyProvider>
    </SessionProvider>
  );
}
