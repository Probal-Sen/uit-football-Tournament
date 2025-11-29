const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:4000/api"
    : "https://uit-football-tournament.onrender.com/api");

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Request failed with ${res.status}`);
    }

    // Handle 204 No Content responses (common for DELETE requests)
    // These responses have no body, so we can't parse JSON
    if (res.status === 204) {
      return null as T;
    }

    // Try to parse JSON, but handle empty responses gracefully
    const text = await res.text();
    if (!text || text.trim() === "") {
      return null as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      // If JSON parsing fails, return null
      return null as T;
    }
  } catch (error) {
    // Handle network errors (backend not running, CORS, etc.)
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(
        `Unable to connect to the server. Please ensure the backend is running at ${API_BASE}`
      );
    }
    throw error;
  }
}
