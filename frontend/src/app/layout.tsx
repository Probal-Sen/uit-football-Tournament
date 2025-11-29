import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "UIT BU Inter-Department Football",
  description:
    "UIT Burdwan University inter-department football tournament portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="app-shell">
            <header className="app-header">
              <div className="brand">
                <span className="brand-title">
                  UIT Burdwan University Football Tournament
                </span>
                <span className="brand-subtitle">
                  Inter-Department Championship
                </span>
              </div>
              <NavBar />
            </header>
            <main className="app-main">{children}</main>
            <footer className="app-footer">
              <span>
                University Institute of Technology, Burdwan University &copy;{" "}
                {new Date().getFullYear()}
              </span>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
