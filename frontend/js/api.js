const API_BASE = (window.R4L_API_BASE || "/api/v1").replace(/\/$/, "");
let csrfToken = null;
export async function api(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (method !== "GET" && method !== "HEAD" && csrfToken) headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(`${API_BASE}${path}`, { ...options, method, headers, credentials: "include" });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Ошибка запроса (${response.status})`);
  if (data?.csrfToken) csrfToken = data.csrfToken;
  return data;
}
export const json = (method, body) => ({ method, body: JSON.stringify(body) });
export function setCsrf(token) { csrfToken = token; }
