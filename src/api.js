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

export async function apiFetch(path, options = {}) {
  return request(path, options);
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

export async function getUniversityBySlug(slug) {
  return apiGet(`/universities/slug/${encodeURIComponent(slug)}`);
}

export async function updateMe(data) {
  return apiPatch("/users/me", data);
}

export async function getUniversityByName(name) {
  const universities = await getUniversities();
  return universities.find(u => u.name === name || u.shortName === name) || null;
}

// ─── University news ─────────────────────────────────────────────
export async function getUniversityNews(universityId) {
  return apiGet(`/universities/${universityId}/news`);
}

export async function getUniversityNewsAdmin(universityId) {
  return apiGet(`/universities/${universityId}/news/admin`);
}

export async function createUniversityNews(universityId, data) {
  return apiPost(`/universities/${universityId}/news`, data);
}

export async function updateUniversityNews(universityId, newsId, data) {
  return apiPatch(`/universities/${universityId}/news/${newsId}`, data);
}

export async function deleteUniversityNews(universityId, newsId) {
  return apiDelete(`/universities/${universityId}/news/${newsId}`);
}

// ─── Activity tracking ───────────────────────────────────────────
// Batched and fire-and-forget: tracking must never block or break the UI.
const eventQueue = [];
let flushTimer = null;
const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 50; // matches the server limit
const MAX_QUEUE = 200;

export function trackEvent(eventType, { courseId, topicId, materialId, payload } = {}) {
  try {
    if (!getAccessToken()) return; // not logged in, nothing to attribute
    eventQueue.push({
      eventType,
      idempotencyKey: crypto.randomUUID(),
      courseId, topicId, materialId, payload,
    });
    if (eventQueue.length > MAX_QUEUE) eventQueue.splice(0, eventQueue.length - MAX_QUEUE);
    if (eventQueue.length >= 20) return void flushEvents();
    if (!flushTimer) flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL_MS);
  } catch {
    /* never let tracking throw */
  }
}

async function flushEvents() {
  clearTimeout(flushTimer);
  flushTimer = null;
  if (eventQueue.length === 0) return;

  const batch = eventQueue.splice(0, MAX_BATCH);
  try {
    await apiPost("/activity/events", { events: batch });
  } catch (err) {
    // 4xx = the batch itself is bad, drop it. Anything else (network, 5xx):
    // requeue, at most 3 tries per event. Safe to retry because of idempotency keys.
    const isClientError = /API error: 4\d\d/.test(err?.message || "");
    if (!isClientError) {
      const retryable = batch
        .map((e) => ({ ...e, _tries: (e._tries || 0) + 1 }))
        .filter((e) => e._tries <= 3);
      eventQueue.unshift(...retryable);
    }
  }
  if (eventQueue.length > 0 && !flushTimer) {
    flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL_MS);
  }
}
