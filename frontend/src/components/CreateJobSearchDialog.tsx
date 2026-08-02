import { useState } from "react";
import type { SubmitEvent } from "react";
import {
  Alert,
  Button,
  CloseButton,
  Dialog,
  Field,
  Input,
  NativeSelect,
  Portal,
  Stack,
} from "@chakra-ui/react";
import { ApplicationType } from "../index";
import type { JobSearchCreate } from "../index";

interface CreateJobSearchDialogProps {
  onSubmit: (data: JobSearchCreate) => Promise<void>;
  onCancel: () => void;
}

export function CreateJobSearchDialog({ onSubmit, onCancel }: CreateJobSearchDialogProps) {
  const [name, setName] = useState("");
  const [defaultType, setDefaultType] = useState<ApplicationType | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), default_application_type: defaultType || null });
    } catch {
      setError("Could not create job search.");
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
              <Dialog.Title>New Job Search</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="4">
                {error && (
                  <Alert.Root status="error" size="sm">
                    <Alert.Indicator />
                    <Alert.Title>{error}</Alert.Title>
                  </Alert.Root>
                )}
                <Field.Root required>
                  <Field.Label>
                    Name <Field.RequiredIndicator />
                  </Field.Label>
                  <Input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. 2025 Job Search"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Default Application Type</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={defaultType}
                      onChange={(e) => setDefaultType(e.target.value as ApplicationType | "")}
                      color={defaultType ? "fg" : "fg.muted"}
                    >
                      <option value=""></option>
                      {Object.values(ApplicationType).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button type="button" onClick={onCancel} variant="ghost">
                Cancel
              </Button>
              <Button
                type="submit"
                colorPalette="blue"
                loading={isSubmitting}
                disabled={!name.trim()}
              >
                Create
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
