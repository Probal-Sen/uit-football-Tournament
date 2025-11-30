import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "UIT Inter-Department Football",
  description:
    "UIT inter-department football tournament portal",
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
              <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="brand">
                  <span className="brand-title">
                    UIT Football Tournament
                  </span>
                  <span className="brand-subtitle">
                    Inter-Department Championship
                  </span>
                </div>
              </Link>
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
