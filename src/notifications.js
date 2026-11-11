import { apiPost } from "./api";

// Notifications belong to the signed-in database user, so the backend derives
// the recipient from the access token instead of trusting a client-supplied ID.
export async function createNotification(_userId, { type, message }) {
  return apiPost("/notifications", { type, message });
}
