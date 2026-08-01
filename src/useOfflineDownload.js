// useOfflineDownload.js
import { useState, useEffect, useCallback } from "react";
import {
  isMaterialDownloaded,
  downloadMaterial,
  deleteOfflineMaterial,
  getOfflineBlobUrl,
} from "./offlineStorage";

/**
 * Tracks and controls offline-download state for a single study material.
 * Pass the file object (needs at least { id, signedUrl, title, ...metadata }).
 */
export function useOfflineDownload(file) {
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

 const checkStatus = useCallback(async () => {
  if (!file?.id) return;
  const isDown = await isMaterialDownloaded(file.id);
  setDownloaded(isDown);
}, [file]);

// eslint-disable-next-line react-hooks/set-state-in-effect -- false positive, `checkStatus` is
// already async; see https://github.com/react/react/issues/34743
useEffect(() => {
  checkStatus();
}, [checkStatus]);

const download = useCallback(async () => {
  if (!file) return;
  setDownloading(true);
  setProgress(0);
  setError("");
  try {
    await downloadMaterial(file, setProgress);
    setDownloaded(true);
  } catch (err) {
    console.error(err);
    setError("Download failed. Try again.");
  } finally {
    setDownloading(false);
  }
}, [file]);

const remove = useCallback(async () => {
  if (!file?.id) return;
  await deleteOfflineMaterial(file.id);
  setDownloaded(false);
}, [file]);

const getBlobUrl = useCallback(async () => {
  if (!file?.id) return null;
  return getOfflineBlobUrl(file.id);
}, [file]);

return { downloaded, downloading, progress, error, download, remove, getBlobUrl };
}