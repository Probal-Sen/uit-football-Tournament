const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://uit-football-tournament.onrender.com/api/";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    // Normalize path: ensure no double slashes
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${base}${normalizedPath}`;
    const res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      let errorMessage = `Request failed with ${res.status}`;
      try {
        const data = await res.json();
        errorMessage = data.message || data.error || errorMessage;
        // Log the full error for debugging
        console.error('API Error Response:', {
          status: res.status,
          statusText: res.statusText,
          data: data
        });
      } catch (parseError) {
        // If JSON parsing fails, try to get text
        const text = await res.text().catch(() => '');
        errorMessage = text || errorMessage;
        console.error('API Error (non-JSON):', {
          status: res.status,
          statusText: res.statusText,
          text: text
        });
      }
      throw new Error(errorMessage);
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


