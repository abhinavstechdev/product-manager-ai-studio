export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-workspace-id': 'ws_default_001',
      'x-user-name': 'Abhinav Sharma',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errMessage = `Error ${res.status}: ${res.statusText}`;
    try {
      const json = await res.json();
      if (json.error) errMessage = json.error;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  return res.json();
}
