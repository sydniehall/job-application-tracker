import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link } from "react-router-dom";

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === "login";

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit(email, password);
    } catch {
      setError(
        isLogin
          ? "Incorrect email or password"
          : "Could not register. Check your details and try again."
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-bold text-center">
          {isLogin ? "Log In" : "Register"}
        </h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={isLogin ? undefined : 8}
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded px-3 py-2 font-semibold"
        >
          {isLogin ? "Log In" : "Register"}
        </button>
        <p className="text-sm text-center">
          {isLogin ? (
            <>Don't have an account? <Link to="/register" className="text-blue-600">Register</Link></>
          ) : (
            <>Already have an account? <Link to="/login" className="text-blue-600">Log in</Link></>
          )}
        </p>
      </form>
    </div>
  );
}
