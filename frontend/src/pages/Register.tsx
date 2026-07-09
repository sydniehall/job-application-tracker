import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthForm } from "../components/AuthForm";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(email: string, password: string) {
    await register({ email, password });
    navigate("/", { replace: true });
  }

  return <AuthForm mode="register" onSubmit={handleSubmit} />;
}
