import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthForm } from "../components/AuthForm";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(email: string, password: string) {
    await login(email, password);
    navigate("/", { replace: true });
  }

  return <AuthForm mode="login" onSubmit={handleSubmit} />;
}
