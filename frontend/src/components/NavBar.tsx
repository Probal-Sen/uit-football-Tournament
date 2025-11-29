"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export function NavBar() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
  }

  if (isLoading) {
    return (
      <nav className="top-nav">
        <a href="/teams">Teams</a>
        <a href="/fixtures">Fixtures</a>
        <a href="/live">Live</a>
        <a href="/points">Points Table</a>
        <a href="/admin/login" className="admin-link">
          Admin
        </a>
      </nav>
    );
  }

  return (
    <nav className="top-nav">
      <a href="/teams">Teams</a>
      <a href="/fixtures">Fixtures</a>
      <a href="/live">Live</a>
      <a href="/points">Points Table</a>
      {isAuthenticated ? (
        <>
          <a href="/admin" className="admin-link">
            Dashboard
          </a>
          <button
            onClick={handleLogout}
            className="admin-link"
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "inherit",
              padding: 0,
            }}
          >
            Logout
          </button>
        </>
      ) : (
        <a href="/admin/login" className="admin-link">
          Admin
        </a>
      )}
    </nav>
  );
}

