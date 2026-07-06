import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  deleteAccount as apiDeleteAccount,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from "../api/auth";
import { token } from "../api/token";
import type { DeleteAccount, UserCreate, UserRead } from "../index";

interface AuthState {
  user: UserRead | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  register: (data: UserCreate) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  deleteAccount: (data: DeleteAccount) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  // On mount, restore session if a token exists.
  useEffect(() => {
    if (!token.get()) {
      setState({ user: null, isLoading: false });
      return;
    }
    getMe()
      .then((user) => setState({ user, isLoading: false }))
      .catch(() => setState({ user: null, isLoading: false }));
  }, []);

  async function login(email: string, password: string) {
    await apiLogin(email, password);
    const user = await getMe();
    setState({ user, isLoading: false });
  }

  async function register(data: UserCreate) {
    await apiRegister(data);
    await login(data.email, data.password);
  }

  function logout() {
    apiLogout();
    setState({ user: null, isLoading: false });
  }

  async function deleteAccount(data: DeleteAccount) {
    await apiDeleteAccount(data);
    apiLogout();
    setState({ user: null, isLoading: false });
  }

  return (
    <AuthContext.Provider value={{ ...state, register, login, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
