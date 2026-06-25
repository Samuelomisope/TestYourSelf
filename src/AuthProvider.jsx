import { useEffect, useState, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import { API } from "./config";
import { setAccessToken } from "./token";
import { apiGet } from "./api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const data = await apiGet('/users/me');
    setUser(data);
    return data;
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      await fetchMe();
    } catch {
      // silent — interceptor in api.js already tried refreshing once
    }
  }, [fetchMe]);

  const loginWithGoogle = useCallback(async (idToken) => {
    const res = await fetch(`${API}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error("Google login failed");
    const data = await res.json();
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await fetch(`${API}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          await fetchMe();
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}