import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  deleteAccount as apiDeleteAccount,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  updateSettings as apiUpdateSettings,
} from "../api/auth";
import { token } from "../api/token";
import type { DeleteAccount, UserCreate, UserRead, UserSettingsUpdate } from "../index";

interface AuthState {
  user: UserRead | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  register: (data: UserCreate) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  deleteAccount: (data: DeleteAccount) => Promise<void>;
  updateSettings: (data: UserSettingsUpdate) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  // On mount, restore the session. Even without a stored access token the
  // httpOnly refresh cookie may still be valid — the API client refreshes
  // and retries automatically on 401.
  useEffect(() => {
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
    void apiLogout(); // fire-and-forget server-side revocation
    setState({ user: null, isLoading: false });
  }

  async function deleteAccount(data: DeleteAccount) {
    await apiDeleteAccount(data); // cascade revokes refresh tokens server-side
    token.clear();
    setState({ user: null, isLoading: false });
  }

  async function updateSettings(data: UserSettingsUpdate) {
    const user = await apiUpdateSettings(data);
    setState((prev) => ({ ...prev, user }));
  }

  return (
    <AuthContext.Provider
      value={{ ...state, register, login, logout, deleteAccount, updateSettings }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
