import { useState } from "react";
import type { SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  Container,
  Field,
  Flex,
  Heading,
  IconButton,
  Input,
  NativeSelect,
  Stack,
  Text,
} from "@chakra-ui/react";
import { LuArrowLeft, LuEye, LuEyeOff } from "react-icons/lu";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../api/auth";
import { ApplicationType } from "../index";

const SORT_FIELD_LABELS: Record<string, string> = {
  created_at: "Date Added",
  title: "Title",
  company: "Company",
  status: "Status",
  location: "Location",
  type: "Type",
  date_applied: "Applied Date",
  deadline: "Deadline",
};

function PasswordInput({
  value,
  onChange,
  label,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field.Root required>
      <Field.Label>
        {label} <Field.RequiredIndicator />
      </Field.Label>
      <Box position="relative" w="full">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          pe="10"
        />
        <IconButton
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          title={show ? "Hide password" : "Show password"}
          variant="ghost"
          size="sm"
          color="fg.muted"
          position="absolute"
          top="50%"
          right="1"
          transform="translateY(-50%)"
          tabIndex={-1}
        >
          {show ? <LuEyeOff /> : <LuEye />}
        </IconButton>
      </Box>
    </Field.Root>
  );
}

export function Account() {
  const { user, updateSettings } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [defaultCurrency, setDefaultCurrency] = useState(user?.default_currency ?? "$");
  const [defaultType, setDefaultType] = useState<ApplicationType | "">(
    user?.default_application_type ?? ""
  );
  const [defaultSortField, setDefaultSortField] = useState(user?.default_sort_field ?? "created_at");
  const [defaultSortDir, setDefaultSortDir] = useState(user?.default_sort_dir ?? "desc");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  async function handleChangePassword(e: SubmitEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
    } catch (err) {
      const detail =
        axios.isAxiosError(err) && typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Could not change password. Please try again.";
      setPasswordError(detail);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleSaveSettings(e: SubmitEvent) {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(false);
    setIsSavingSettings(true);
    try {
      await updateSettings({
        default_currency: defaultCurrency || "$",
        default_application_type: defaultType || null,
        default_sort_field: defaultSortField,
        default_sort_dir: defaultSortDir,
      });
      setSettingsSuccess(true);
    } catch {
      setSettingsError("Could not save defaults. Please try again.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <Box minH="100vh" bg="bg.subtle" py="8">
      <Container maxW="4xl">
        <Box maxW="600px" mx="auto">
          <Flex align="center" gap="3" mb="8">
            <IconButton
              onClick={() => navigate("/")}
              aria-label="Back to dashboard"
              title="Back to dashboard"
              variant="ghost"
              size="sm"
              color="fg.muted"
            >
              <LuArrowLeft />
            </IconButton>
            <Heading size="xl">Account</Heading>
          </Flex>

          <Stack gap="6">
            <Card.Root>
              <Card.Header>
                <Heading size="md">Account Info</Heading>
              </Card.Header>
              <Card.Body>
                <Field.Root>
                  <Field.Label>Email</Field.Label>
                  <Input value={user?.email ?? ""} readOnly disabled />
                </Field.Root>
              </Card.Body>
            </Card.Root>

            <Card.Root as="form" onSubmit={handleChangePassword}>
              <Card.Header>
                <Heading size="md">Change Password</Heading>
              </Card.Header>
              <Card.Body>
                <Stack gap="4">
                  {passwordError && (
                    <Alert.Root status="error" size="sm">
                      <Alert.Indicator />
                      <Alert.Title>{passwordError}</Alert.Title>
                    </Alert.Root>
                  )}
                  {passwordSuccess && (
                    <Alert.Root status="success" size="sm">
                      <Alert.Indicator />
                      <Alert.Title>Password changed successfully</Alert.Title>
                    </Alert.Root>
                  )}
                  <PasswordInput
                    label="Current Password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    autoComplete="current-password"
                  />
                  <PasswordInput
                    label="New Password"
                    value={newPassword}
                    onChange={setNewPassword}
                    autoComplete="new-password"
                  />
                  <PasswordInput
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                  />
                </Stack>
              </Card.Body>
              <Card.Footer>
                <Button
                  type="submit"
                  colorPalette="blue"
                  ml="auto"
                  loading={isChangingPassword}
                  loadingText="Saving..."
                >
                  Reset Password
                </Button>
              </Card.Footer>
            </Card.Root>

            <Card.Root as="form" onSubmit={handleSaveSettings}>
              <Card.Header>
                <Heading size="md">Defaults</Heading>
                <Text textStyle="sm" color="fg.muted">
                  Applied automatically to new applications and the dashboard sort order.
                </Text>
              </Card.Header>
              <Card.Body>
                <Stack gap="4">
                  {settingsError && (
                    <Alert.Root status="error" size="sm">
                      <Alert.Indicator />
                      <Alert.Title>{settingsError}</Alert.Title>
                    </Alert.Root>
                  )}
                  {settingsSuccess && (
                    <Alert.Root status="success" size="sm">
                      <Alert.Indicator />
                      <Alert.Title>Defaults saved</Alert.Title>
                    </Alert.Root>
                  )}
                  <Field.Root>
                    <Field.Label>Default Currency</Field.Label>
                    <Input
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value)}
                      maxLength={3}
                      w="20"
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Default Application Type</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={defaultType}
                        onChange={(e) => setDefaultType(e.target.value as ApplicationType | "")}
                      >
                        <option value="">—</option>
                        {Object.values(ApplicationType).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>
                  <Flex gap="4">
                    <Field.Root flex="1">
                      <Field.Label>Default Sort Field</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={defaultSortField}
                          onChange={(e) => setDefaultSortField(e.target.value)}
                        >
                          {Object.entries(SORT_FIELD_LABELS).map(([field, label]) => (
                            <option key={field} value={field}>
                              {label}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>
                    <Field.Root flex="1">
                      <Field.Label>Default Sort Direction</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={defaultSortDir}
                          onChange={(e) => setDefaultSortDir(e.target.value)}
                        >
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>
                  </Flex>
                </Stack>
              </Card.Body>
              <Card.Footer>
                <Button
                  type="submit"
                  colorPalette="blue"
                  ml="auto"
                  loading={isSavingSettings}
                  loadingText="Saving..."
                >
                  Save Defaults
                </Button>
              </Card.Footer>
            </Card.Root>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
