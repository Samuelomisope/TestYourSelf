import { getRedirectResult } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

/**
 * Call this in a useEffect on mount in any page that triggers signInWithRedirect.
 * It picks up the Google auth result after the user is redirected back.
 */
export async function handleGoogleRedirectResult(navigate, onError) {
  try {
    const result = await getRedirectResult(auth);
     console.log("Redirect result:", result); 
    if (!result) return; // no pending redirect — nothing to do

    await setDoc(
      doc(db, "users", result.user.uid),
      {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL || null,
        createdAt: new Date(),
      },
      { merge: true }
    );

    navigate("/home", { state: { fromLogin: true } });
  } catch (err) {
    console.error("Google redirect result error:", err);
    if (onError) onError("Failed to complete Google sign-in. Please try again.");
  }
}