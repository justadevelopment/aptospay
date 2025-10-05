/**
 * Safe JSON fetch helper
 * Ensures we only parse JSON responses and provides better error messages
 */

export interface FetchResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export async function safeFetch<T>(
  url: string,
  options?: RequestInit
): Promise<FetchResult<T>> {
  try {
    const response = await fetch(url, options);

    // Check content type
    const contentType = response.headers.get("content-type");

    // If not JSON, it's likely an error page
    if (!contentType || !contentType.includes("application/json")) {
      console.error(`Expected JSON from ${url} but got:`, contentType);

      // Try to get text for better error message
      const text = await response.text();
      console.error("Response body preview:", text.substring(0, 200));

      return {
        data: null,
        error: `Server returned ${response.status}: Expected JSON but got ${contentType || "unknown content type"}`,
        status: response.status,
      };
    }

    // Parse JSON
    const data = await response.json();

    // If response not OK, extract error from JSON
    if (!response.ok) {
      return {
        data: null,
        error: data.error || `Request failed with status ${response.status}`,
        status: response.status,
      };
    }

    // Success
    return {
      data,
      error: null,
      status: response.status,
    };
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);

    return {
      data: null,
      error: error instanceof Error ? error.message : "Network request failed",
      status: 0,
    };
  }
}
