import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import toast from "react-hot-toast";
import {
  AuthUser,
  loginRequest,
  registerRequest,
  logoutRequest,
  fetchProfile,
} from "../services/auth.service";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    fullName: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchProfile()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      })
      .finally(() => setIsLoading(false));
  }, []);

  function persistSession(res: { user: AuthUser; accessToken: string; refreshToken: string }) {
    localStorage.setItem("accessToken", res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);
    setUser(res.user);
  }

  async function login(email: string, password: string) {
    const res = await loginRequest({ email, password });
    persistSession(res);
    toast.success(`Welcome back, ${res.user.fullName}`);
  }

  async function register(payload: {
    fullName: string;
    username: string;
    email: string;
    password: string;
  }) {
    const res = await registerRequest(payload);
    persistSession(res);
    toast.success("Account created");
  }

  async function logout() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      await logoutRequest(refreshToken).catch(() => undefined);
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
