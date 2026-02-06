type FetchOptions = {
  body?: unknown;
  context?: unknown;
};

export async function internalFetch<T>(
  path: string,
  options?: FetchOptions
): Promise<T> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
  
  const response = await fetch(`${backendUrl}${path}`, {
    method: options?.body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
