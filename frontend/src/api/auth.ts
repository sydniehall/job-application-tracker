import client from "./client";
import { token } from "./token";
import type {
  ChangePasswordRequest,
  DeleteAccount,
  Token,
  UserCreate,
  UserRead,
  UserSettingsUpdate,
} from "../index";

export async function register(data: UserCreate): Promise<UserRead> {
  const res = await client.post<UserRead>("/auth/register", data);
  return res.data;
}

// /auth/token requires form-encoded body with field name "username" (OAuth2 spec).
export async function login(email: string, password: string): Promise<Token> {
  const res = await client.post<Token>(
    "/auth/token",
    new URLSearchParams({ username: email, password }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  token.set(res.data.access_token);
  return res.data;
}

export async function getMe(): Promise<UserRead> {
  const res = await client.get<UserRead>("/auth/me");
  return res.data;
}

export async function updateSettings(data: UserSettingsUpdate): Promise<UserRead> {
  const res = await client.put<UserRead>("/auth/me", data);
  return res.data;
}

export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  await client.post("/auth/change-password", data);
}

// Axios sends DELETE body via the `data` config key, not as the second argument.
export async function deleteAccount(data: DeleteAccount): Promise<void> {
  await client.delete("/auth/me", { data });
}

// Revokes the refresh token server-side and clears the httpOnly cookie;
// best-effort, since the local session must end either way.
export async function logout(): Promise<void> {
  try {
    await client.post("/auth/logout");
  } catch {
    // Ignore — server-side revocation is best-effort.
  }
  token.clear();
}
