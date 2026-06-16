import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function createNotification(userId, { type, message }) {
  await addDoc(collection(db, "notifications"), {
    userId,
    type,
    message,
    read: false,
    createdAt: serverTimestamp(),
  });
}