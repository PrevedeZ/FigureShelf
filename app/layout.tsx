import type { Metadata } from "next";
import "./globals.css";
import ClientRoot from "../components/ClientRoot";
import Header from "../components/Header";

export const metadata: Metadata = {
  title: "FigureShelf",
  description: "Collect, track, and enjoy your figures.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientRoot>
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-6">
            {children}
          </main>
        </ClientRoot>
      </body>
    </html>
  );
}
