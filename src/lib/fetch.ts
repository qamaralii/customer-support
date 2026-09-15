/**
 * fetchApi — wrapper around fetch that adds the ngrok-skip-browser-warning
 * header so API calls work correctly when the app is served via ngrok.
 * Falls back to standard fetch behaviour in all other environments.
 */
export function fetchApi(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      "ngrok-skip-browser-warning": "true",
      ...(options.headers || {}),
    },
  });
}
