export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    // The rest of the error body, e.g. { problems } for invalid_text or { campaignId } for already_started.
    readonly details: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = "ApiError";
  }
}

type Options = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown };

/**
 * fetch() for our own API routes. On 401 it sends the browser to login and comes back to
 * the current page afterwards; other failures throw ApiError with the route's error code.
 */
export async function apiFetch<T>(path: string, { method = "GET", body }: Options = {}): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401) {
    const returnTo = window.location.pathname + window.location.search;
    // /auth/login is served by the Auth0 proxy, not a Next.js page, so it needs a full navigation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
    // The page is navigating away; never settle so callers don't flash an error.
    return new Promise<T>(() => {});
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const { error: code, ...details } = (data ?? {}) as { error?: unknown } & Record<string, unknown>;
    throw new ApiError(response.status, typeof code === "string" ? code : "server_error", details);
  }
  return data as T;
}
