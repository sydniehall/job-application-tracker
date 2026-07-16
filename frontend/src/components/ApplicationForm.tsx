
import { useRef, useState } from "react";
import type { SubmitEvent } from "react";
import {
  Alert,
  Button,
  CloseButton,
  Dialog,
  Field,
  Flex,
  IconButton,
  Input,
  NativeSelect,
  Portal,
  Stack,
  Textarea,
} from "@chakra-ui/react";
import { LuTrash2 } from "react-icons/lu";
import { ApplicationStatus, ApplicationType } from "../index";
import type { ApplicationCreate } from "../index";

interface FieldSuggestions {
  companies: string[];
  roles: string[];
  locations: string[];
}

interface ApplicationFormProps {
  title: string;
  initial?: Partial<ApplicationCreate>;
  submitLabel: string;
  onSubmit: (data: ApplicationCreate) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  suggestions?: FieldSuggestions;
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
  onDelete,
  suggestions,
}: ApplicationFormProps) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [pay, setPay] = useState(initial?.pay ?? "");
  const [status, setStatus] = useState<ApplicationStatus>(
    initial?.status ?? ApplicationStatus.Applied
  );
  const [type, setType] = useState<ApplicationType | "">(initial?.type ?? "");
  const [dateApplied, setDateApplied] = useState(
    () => initial?.date_applied?.split("T")[0] ?? localToday()
  );
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  // Safari shows today's date as placeholder text in an empty date input, which
  // reads as a pre-filled value. Hide the text while empty and unfocused.
  const [deadlineFocused, setDeadlineFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isToApply = status === ApplicationStatus.ToApply;
  const companyRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const time = new Date().toTimeString().slice(0, 8);
      await onSubmit({
        url: url || null,
        company,
        role,
        location: location || null,
        pay: pay || null,
        status,
        type: type || null,
        date_applied: isToApply || !dateApplied ? null : `${dateApplied}T${time}`,
        deadline: deadline || null,
        notes: notes.trim() || null,
      });
    } catch {
      setError("Could not save application.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(e) => !e.open && onCancel()}
      initialFocusEl={() => companyRef.current}
    >
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
                  <Field.Label>URL</Field.Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </Field.Root>
                <Flex gap="4">
                  <Field.Root required flex="1">
                    <Field.Label>
                      Company <Field.RequiredIndicator />
                    </Field.Label>
                    <Input
                      ref={companyRef}
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      list="company-suggestions"
                    />
                    <datalist id="company-suggestions">
                      {suggestions?.companies.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </Field.Root>
                  <Field.Root required flex="1">
                    <Field.Label>
                      Role <Field.RequiredIndicator />
                    </Field.Label>
                    <Input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      list="role-suggestions"
                    />
                    <datalist id="role-suggestions">
                      {suggestions?.roles.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </Field.Root>
                </Flex>
                <Flex gap="4">
                  <Field.Root flex="1">
                    <Field.Label>Location</Field.Label>
                    <Input
                      placeholder="e.g. Austin, TX / Remote"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      list="location-suggestions"
                    />
                    <datalist id="location-suggestions">
                      {suggestions?.locations.map((l) => (
                        <option key={l} value={l} />
                      ))}
                    </datalist>
                  </Field.Root>
                  <Field.Root flex="1">
                    <Field.Label>Pay</Field.Label>
                    <Input
                      placeholder="e.g. $25/hr or $110k"
                      value={pay}
                      onChange={(e) => setPay(e.target.value)}
                      // Start with "$" on focus; drop it again if left alone.
                      onFocus={() => {
                        if (!pay) setPay("$");
                      }}
                      onBlur={() => {
                        if (pay === "$") setPay("");
                      }}
                    />
                  </Field.Root>
                </Flex>
                <Flex gap="4">
                  <Field.Root flex="1">
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
                  <Field.Root flex="1">
                    <Field.Label>Type</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={type}
                        onChange={(e) =>
                          setType(e.target.value as ApplicationType | "")
                        }
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
                </Flex>
                <Flex gap="4">
                  <Field.Root flex="1" disabled={isToApply}>
                    <Field.Label>Applied Date</Field.Label>
                    <Input
                      type="date"
                      value={isToApply ? "" : dateApplied ?? ""}
                      onChange={(e) => setDateApplied(e.target.value)}
                      disabled={isToApply}
                      css={
                        isToApply
                          ? {
                              color: "transparent",
                              "&::-webkit-datetime-edit": {
                                color: "transparent",
                              },
                            }
                          : undefined
                      }
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
                      // Chrome exposes the ghost text via the datetime-edit
                      // pseudo-element; desktop Safari doesn't, so also make
                      // the input's own text transparent.
                      css={
                        !deadline && !deadlineFocused
                          ? {
                              color: "transparent",
                              "&::-webkit-datetime-edit": {
                                color: "transparent",
                              },
                            }
                          : undefined
                      }
                    />
                  </Field.Root>
                </Flex>
                <Field.Root>
                  <Field.Label>Notes</Field.Label>
                  <Textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Field.Root>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              {onDelete && (
                <IconButton
                  type="button"
                  onClick={onDelete}
                  aria-label="Delete application"
                  title="Delete application"
                  colorPalette="red"
                  variant="ghost"
                  mr="auto"
                >
                  <LuTrash2 />
                </IconButton>
              )}
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
