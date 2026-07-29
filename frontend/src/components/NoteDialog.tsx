import { useState } from "react";
import {
  Button,
  CloseButton,
  Dialog,
  IconButton,
  Portal,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { LuPencil } from "react-icons/lu";
import type { ApplicationRead } from "../index";

interface NoteDialogProps {
  application: ApplicationRead;
  onSave: (notes: string) => Promise<void>;
  onClose: () => void;
}

// Shows an application's note, edits it, or adds one when none exists.
export function NoteDialog({ application, onSave, onClose }: NoteDialogProps) {
  const isAdding = !application.notes;
  const [isEditing, setIsEditing] = useState(isAdding);
  const [text, setText] = useState(application.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    try {
      await onSave(text.trim());
      onClose();
    } catch {
      setError("Could not save note.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {isAdding
                  ? "Add Note"
                  : `Note: ${application.title} @ ${application.company}`}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {isEditing ? (
                <>
                  {error && (
                    <Text textStyle="sm" color="fg.error" mb="2">
                      {error}
                    </Text>
                  )}
                  <Textarea
                    autoFocus
                    rows={5}
                    placeholder="Write a note..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </>
              ) : (
                <Text whiteSpace="pre-wrap">{application.notes}</Text>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (isAdding) {
                        onClose();
                      } else {
                        setText(application.notes ?? "");
                        setIsEditing(false);
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    colorPalette="blue"
                    onClick={handleSave}
                    loading={isSaving}
                    disabled={isAdding && !text.trim()}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <IconButton
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit note"
                  title="Edit note"
                  variant="ghost"
                >
                  <LuPencil />
                </IconButton>
              )}
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
