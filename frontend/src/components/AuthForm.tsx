import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Center,
  Field,
  Heading,
  Input,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";

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
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>
                Password <Field.RequiredIndicator />
              </Field.Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={isLogin ? undefined : 8}
              />
            </Field.Root>
          </Stack>
        </Card.Body>
        <Card.Footer flexDirection="column" gap="3">
          <Button type="submit" colorPalette="blue" w="full">
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
