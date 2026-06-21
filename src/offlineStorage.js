// offlineStorage.js
// Offline storage for study materials.
// - IndexedDB ("ty-offline-db") holds lightweight metadata for each downloaded material.
// - Cache API ("ty-offline-files-v1") holds the actual file blobs (PDF/video/audio/image).
//
// We never cache the signed URL itself (it expires) — we fetch it once, store the
// resulting blob under a stable synthetic key, and never need the signed URL again.

const DB_NAME = "ty-offline-db";
const DB_VERSION = 1;
const STORE_NAME = "materials";
const CACHE_NAME = "ty-offline-files-v1";

const cacheKeyFor = (id) => `https://offline.testyourself.local/material/${id}`;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getMeta(id) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      })
  );
}

function putMeta(meta) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const req = tx.objectStore(STORE_NAME).put(meta);
        req.onsuccess = () => resolve(meta);
        req.onerror = () => reject(req.error);
      })
  );
}

function deleteMeta(id) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const req = tx.objectStore(STORE_NAME).delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      })
  );
}

function getAllMeta() {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      })
  );
}

/** Whether this browser supports the APIs we need for offline storage. */
export function isOfflineCapable() {
  return typeof window !== "undefined" && "caches" in window && "indexedDB" in window;
}

/** Quick check: is this specific material already downloaded? */
export async function isMaterialDownloaded(id) {
  if (!isOfflineCapable()) return false;
  const meta = await getMeta(id);
  return !!meta;
}

/** List all downloaded materials' metadata, most recent first. */
export async function listDownloadedMaterials() {
  if (!isOfflineCapable()) return [];
  const all = await getAllMeta();
  return all.sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));
}

/**
 * Download a material's file and store it for offline use.
 * `file` must have at least { id, signedUrl }. Other fields (title, fileType,
 * department, etc.) are stashed as metadata so it can render in lists offline.
 * `onProgress(percent)` is called with 0-100 as the download proceeds.
 */
export async function downloadMaterial(file, onProgress) {
  if (!isOfflineCapable()) throw new Error("Offline storage not supported in this browser");
  if (!file?.id) throw new Error("Missing file id");
  if (!file?.signedUrl) throw new Error("Missing file URL");

  const res = await fetch(file.signedUrl);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);

  const total = Number(res.headers.get("content-length")) || file.fileSize || 0;
  const contentType = res.headers.get("content-type") || file.fileType || "application/octet-stream";

  let blob;
  if (res.body && total) {
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (onProgress) onProgress(Math.min(99, Math.round((loaded / total) * 100)));
    }
    blob = new Blob(chunks, { type: contentType });
  } else {
    // No content-length to track against (some signed URLs omit it) — fall back
    // to a plain blob() read, no granular progress possible.
    blob = await res.blob();
  }

  const cache = await caches.open(CACHE_NAME);
  const cacheRequest = new Request(cacheKeyFor(file.id));
  const cacheResponse = new Response(blob, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(blob.size),
    },
  });
  await cache.put(cacheRequest, cacheResponse);

  const meta = {
    id: file.id,
    title: file.title || "Untitled",
    fileType: file.fileType || contentType,
    fileSize: blob.size,
    department: file.department || null,
    faculty: file.faculty || null,
    level: file.level || null,
    semester: file.semester || null,
    description: file.description || null,
    isPublic: file.isPublic ?? null,
    university: file.university || null,
    user: file.user || null,
    createdAt: file.createdAt || null,
    downloadedAt: Date.now(),
  };
  await putMeta(meta);

  if (onProgress) onProgress(100);
  return meta;
}

/** Get a usable blob: URL for a downloaded material, or null if not downloaded. */
export async function getOfflineBlobUrl(id) {
  if (!isOfflineCapable()) return null;
  const cache = await caches.open(CACHE_NAME);
  const res = await cache.match(cacheKeyFor(id));
  if (!res) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Remove a material from offline storage (both the blob and its metadata). */
export async function deleteOfflineMaterial(id) {
  if (!isOfflineCapable()) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(cacheKeyFor(id));
  await deleteMeta(id);
}

/** Browser-reported storage usage/quota in bytes, where available. */
export async function getOfflineStorageEstimate() {
  if (!navigator.storage?.estimate) return { usage: 0, quota: 0 };
  const { usage, quota } = await navigator.storage.estimate();
  return { usage: usage || 0, quota: quota || 0 };
}

/** Ask the browser not to evict our cached files under storage pressure. */
export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}