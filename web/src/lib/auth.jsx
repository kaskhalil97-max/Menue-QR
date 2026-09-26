import React, { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, setAuthToken } from "./api.js";
import { socket } from "./socket.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("staff_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setAuthToken(token);
    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data);
        socket.emit("staff:auth", token);
      })
      .catch(() => {
        setToken(null);
        localStorage.removeItem("staff_token");
        setAuthToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("staff_token", res.data.token);
    setAuthToken(res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    socket.emit("staff:auth", res.data.token);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem("staff_token");
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/staff/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/staff/login" replace />;
  return children;
}
