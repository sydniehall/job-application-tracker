import { useState } from "react";
import type { SubmitEvent } from "react";
import {
  Alert,
  Button,
  CloseButton,
  Dialog,
  Field,
  Flex,
  Input,
  NativeSelect,
  Portal,
  Stack,
} from "@chakra-ui/react";
import { ApplicationStatus } from "../index";
import type { ApplicationCreate } from "../index";

interface ApplicationFormProps {
  title: string;
  initial?: Partial<ApplicationCreate>;
  submitLabel: string;
  onSubmit: (data: ApplicationCreate) => Promise<void>;
  onCancel: () => void;
}

// Local date as YYYY-MM-DD (toISOString would give the UTC date, which is
// tomorrow during US evenings).
function localToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function ApplicationForm({
  title,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: ApplicationFormProps) {
  const [jobUrl, setJobUrl] = useState(initial?.job_url ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [status, setStatus] = useState<ApplicationStatus>(
    initial?.status ?? ApplicationStatus.Applied
  );
  const [dateApplied, setDateApplied] = useState(
    () => initial?.date_applied?.split("T")[0] ?? localToday()
  );
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  // Safari shows today's date as placeholder text in an empty date input, which
  // reads as a pre-filled value. Hide the text while empty and unfocused.
  const [deadlineFocused, setDeadlineFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isToApply = status === ApplicationStatus.ToApply;

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const time = new Date().toTimeString().slice(0, 8);
      await onSubmit({
        job_url: jobUrl || null,
        company,
        role,
        status,
        date_applied: isToApply || !dateApplied ? null : `${dateApplied}T${time}`,
        deadline: deadline || null,
      });
    } catch {
      setError("Could not save application.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(e) => !e.open && onCancel()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content as="form" onSubmit={handleSubmit}>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="4">
                {error && (
                  <Alert.Root status="error" size="sm">
                    <Alert.Indicator />
                    <Alert.Title>{error}</Alert.Title>
                  </Alert.Root>
                )}
                <Field.Root>
                  <Field.Label>Job URL</Field.Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    autoFocus
                  />
                </Field.Root>
                <Flex gap="4">
                  <Field.Root required flex="1">
                    <Field.Label>
                      Company <Field.RequiredIndicator />
                    </Field.Label>
                    <Input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </Field.Root>
                  <Field.Root required flex="1">
                    <Field.Label>
                      Role <Field.RequiredIndicator />
                    </Field.Label>
                    <Input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </Field.Root>
                </Flex>
                <Field.Root>
                  <Field.Label>Status</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as ApplicationStatus)
                      }
                    >
                      {Object.values(ApplicationStatus).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>
                <Flex gap="4">
                  <Field.Root flex="1" disabled={isToApply}>
                    <Field.Label>Applied Date</Field.Label>
                    <Input
                      type="date"
                      value={isToApply ? "" : dateApplied ?? ""}
                      onChange={(e) => setDateApplied(e.target.value)}
                      disabled={isToApply}
                    />
                  </Field.Root>
                  <Field.Root flex="1">
                    <Field.Label>Deadline</Field.Label>
                    <Input
                      type="date"
                      value={deadline ?? ""}
                      onChange={(e) => setDeadline(e.target.value)}
                      onFocus={() => setDeadlineFocused(true)}
                      onBlur={() => setDeadlineFocused(false)}
                      css={
                        !deadline && !deadlineFocused
                          ? {
                              "&::-webkit-datetime-edit": {
                                color: "transparent",
                              },
                            }
                          : undefined
                      }
                    />
                  </Field.Root>
                </Flex>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button type="button" onClick={onCancel} variant="ghost">
                Cancel
              </Button>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {submitLabel}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
