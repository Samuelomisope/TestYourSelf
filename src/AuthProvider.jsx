import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, reload } from "firebase/auth";
import { AuthContext } from "./AuthContext";
import { API } from "./config";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Reload to get the freshest emailVerified from Firebase
        await reload(currentUser);

        // Read emailVerified immediately after reload
        setEmailVerified(currentUser.emailVerified);

        try {
          const token = await currentUser.getIdToken();
          const res = await fetch(`${API}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          setUser({ ...currentUser, photoURL: data.photoURL || currentUser.photoURL });
        } catch {
          setUser(currentUser);
        }
      } else {
        setUser(null);
        setEmailVerified(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, emailVerified }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}