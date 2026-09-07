export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setApiTokenGetter(getter: TokenGetter | null) {
  tokenGetter = getter;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenGetter ? await tokenGetter() : null;
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}
