"use client";

import React from "react";
import ClientRoot from "./ClientRoot";

export default function ClientApp({ children }: { children: React.ReactNode }) {
  return <ClientRoot>{children}</ClientRoot>;
}