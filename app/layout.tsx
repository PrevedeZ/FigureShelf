// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import ClientApp from "../components/ClientApp";

export const metadata = {
  title: "FigureShelf",
  description: "Track and manage your figure collection.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Render Header (and providers) exactly once here */}
        <ClientApp>{children}</ClientApp>
      </body>
    </html>
  );
}
