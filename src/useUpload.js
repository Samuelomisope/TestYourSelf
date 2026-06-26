import { getAccessToken } from "./token";
import { auth } from "./firebase";

import { API } from "./config";

export async function uploadSingle(file, folder = "general") {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API}/upload/single?folder=${folder}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url;
}

export async function uploadMultiple(files, folder = "general") {
  const token = getAccessToken();
  const formData = new FormData();
  files.forEach(file => formData.append("files", file));

  const res = await fetch(`${API}/upload/multiple?folder=${folder}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.urls;
}







