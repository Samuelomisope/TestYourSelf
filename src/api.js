import { API } from "./config";
import { getAccessToken, setAccessToken } from "./token";

const BASE_URL = API;

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Refresh failed");
        const data = await res.json();
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

function getAuthHeaders() {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}, retried = false) {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !retried) {
    const newToken = await refreshAccessToken().catch(() => null);
    if (newToken) {
      return request(path, options, true);
    }
  }

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiGet(path) {
  return request(path);
}

export async function apiPost(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

export async function apiPatch(path, body) {
  return request(path, { method: "PATCH", body: JSON.stringify(body) });
}

export async function apiDelete(path) {
  return request(path, { method: "DELETE" });
}

export async function getUniversities() {
  const res = await fetch(`${BASE_URL}/universities`);
  if (!res.ok) throw new Error("Failed to fetch universities");
  return res.json();
}

export async function updateMe(data) {
  return apiPatch("/users/me", data);
}

export async function getUniversityByName(name) {
  const universities = await getUniversities();
  return universities.find(u => u.name === name || u.shortName === name) || null;
}