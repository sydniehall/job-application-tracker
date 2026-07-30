import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  Center,
  Field,
  Heading,
  IconButton,
  Input,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import { LuEye, LuEyeOff } from "react-icons/lu";

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      // A failed login/register request is either bad credentials (401) or
      // something else (network down, server error) — worth telling those
      // apart so a server hiccup doesn't read as "you typed it wrong".
      const isAuthFailure =
        axios.isAxiosError(err) && err.response !== undefined && err.response.status < 500;
      if (isAuthFailure) {
        setError(
          isLogin
            ? "Incorrect email or password"
            : "Could not register. Check your details and try again."
        );
      } else {
        setError("Something went wrong. Please check your connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Center minH="100vh" bg="bg.subtle" px="4">
      <Card.Root as="form" onSubmit={handleSubmit} w="full" maxW="sm">
        <Card.Header>
          <Heading size="xl" textAlign="center">
            {isLogin ? "Log In" : "Register"}
          </Heading>
        </Card.Header>
        <Card.Body>
          <Stack gap="4">
            {error && (
              <Alert.Root status="error" size="sm">
                <Alert.Indicator />
                <Alert.Title>{error}</Alert.Title>
              </Alert.Root>
            )}
            <Field.Root required>
              <Field.Label>
                Email <Field.RequiredIndicator />
              </Field.Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                disabled={isSubmitting}
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>
                Password <Field.RequiredIndicator />
              </Field.Label>
              <Box position="relative" w="full">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={isLogin ? undefined : 8}
                  disabled={isSubmitting}
                  pe="10"
                />
                <IconButton
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  variant="ghost"
                  size="sm"
                  color="fg.muted"
                  position="absolute"
                  top="50%"
                  right="1"
                  transform="translateY(-50%)"
                  tabIndex={-1}
                >
                  {showPassword ? <LuEyeOff /> : <LuEye />}
                </IconButton>
              </Box>
            </Field.Root>
          </Stack>
        </Card.Body>
        <Card.Footer flexDirection="column" gap="3">
          <Button type="submit" colorPalette="blue" w="full" loading={isSubmitting} loadingText="Please wait...">
            {isLogin ? "Log In" : "Register"}
          </Button>
          <Text textStyle="sm" color="fg.muted" textAlign="center">
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <Link asChild color="blue.fg">
                  <RouterLink to="/register">Register</RouterLink>
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link asChild color="blue.fg">
                  <RouterLink to="/login">Log in</RouterLink>
                </Link>
              </>
            )}
          </Text>
        </Card.Footer>
      </Card.Root>
    </Center>
  );
}
