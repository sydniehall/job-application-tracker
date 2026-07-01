import client from "./client";
import { token } from "./token";
import type { DeleteAccount, Token, UserCreate, UserRead } from "../index";

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

// Axios sends DELETE body via the `data` config key, not as the second argument.
export async function deleteAccount(data: DeleteAccount): Promise<void> {
  await client.delete("/auth/me", { data });
}

// JWTs are stateless — logout is client-side only.
export function logout(): void {
  token.clear();
}
