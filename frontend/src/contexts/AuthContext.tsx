"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  async function checkAuth() {
    try {
      // Try to access an admin-only endpoint to check if authenticated

      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE ||
        (typeof window !== "undefined" &&
        window.location.hostname === "localhost"
          ? "http://localhost:4000/api"
          : "https://uit-football-tournament.onrender.com/api");
      const response = await fetch(`${apiBase}/teams/all`, {
        credentials: "include",
      });
      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // Add a small delay to allow the browser to process the Set-Cookie header
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Verify the token was actually set by checking auth
    await checkAuth();
    router.push("/admin");
  }

  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors
    }
    setIsAuthenticated(false);
    router.push("/");
  }

  useEffect(() => {
    void checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, login, logout, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
