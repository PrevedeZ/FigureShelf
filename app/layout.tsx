import "./globals.css";
import SessionProviderWrapper from "../components/SessionProvider";
import { CurrencyProvider } from "../components/CurrencyContext";
import { CollectionProvider } from "../components/CollectionStore";
import AdminDock from "../components/AdminDock";

export const metadata = {
  title: "FigureShelf",
  description: "A polished catalog & collection tracker for figures",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>
          <CurrencyProvider>
            <CollectionProvider>
              {children}
              <AdminDock />
            </CollectionProvider>
          </CurrencyProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
