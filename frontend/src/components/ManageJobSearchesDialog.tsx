import { useState } from "react";
import {
  Badge,
  Button,
  CloseButton,
  Dialog,
  Flex,
  IconButton,
  Input,
  NativeSelect,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react";
import { LuArchive, LuArchiveRestore, LuCheck, LuPencil, LuTrash2, LuX } from "react-icons/lu";
import { ApplicationType } from "../index";
import type { JobSearchRead, JobSearchUpdate } from "../index";

interface JobSearchRowProps {
  jobSearch: JobSearchRead;
  onUpdate: (id: number, data: JobSearchUpdate) => Promise<void>;
  onToggleArchive: (jobSearch: JobSearchRead) => Promise<void>;
  onDelete: (jobSearch: JobSearchRead) => Promise<void>;
}

function JobSearchRow({ jobSearch, onUpdate, onToggleArchive, onDelete }: JobSearchRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(jobSearch.name);
  const [defaultType, setDefaultType] = useState<ApplicationType | "">(
    jobSearch.default_application_type ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);

  function cancelEdit() {
    setName(jobSearch.name);
    setDefaultType(jobSearch.default_application_type ?? "");
    setIsEditing(false);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }
    setIsSaving(true);
    try {
      await onUpdate(jobSearch.id, {
        name: trimmed,
        default_application_type: defaultType || null,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Flex align="center" gap="2" py="2" borderBottomWidth="1px" borderColor="border.subtle">
      {isEditing ? (
        <Flex flex="1" align="center" gap="1" wrap="wrap">
          <Input
            size="sm"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancelEdit();
            }}
            flex="1"
            minW="120px"
          />
          <NativeSelect.Root size="sm" w="36">
            <NativeSelect.Field
              value={defaultType}
              onChange={(e) => setDefaultType(e.target.value as ApplicationType | "")}
            >
              <option value="">No default type</option>
              {Object.values(ApplicationType).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <IconButton
            aria-label="Save"
            title="Save"
            size="xs"
            variant="ghost"
            colorPalette="green"
            loading={isSaving}
            onClick={save}
          >
            <LuCheck />
          </IconButton>
          <IconButton aria-label="Cancel" title="Cancel" size="xs" variant="ghost" onClick={cancelEdit}>
            <LuX />
          </IconButton>
        </Flex>
      ) : (
        <Flex flex="1" align="center" gap="2" minW="0" wrap="wrap">
          <Text truncate fontWeight="medium" color={jobSearch.archived ? "fg.subtle" : "fg"}>
            {jobSearch.name}
          </Text>
          {jobSearch.archived && (
            <Badge size="sm" colorPalette="gray" flexShrink="0">
              Archived
            </Badge>
          )}
          {jobSearch.default_application_type && (
            <Badge size="sm" colorPalette="blue" flexShrink="0">
              {jobSearch.default_application_type}
            </Badge>
          )}
          <Text textStyle="xs" color="fg.subtle" flexShrink="0">
            {jobSearch.application_count} application{jobSearch.application_count === 1 ? "" : "s"}
          </Text>
        </Flex>
      )}

      {!isEditing && (
        <Flex gap="0.5" flexShrink="0">
          <IconButton
            aria-label="Edit"
            title="Edit"
            size="xs"
            variant="ghost"
            color="fg.subtle"
            _hover={{ color: "fg" }}
            onClick={() => setIsEditing(true)}
          >
            <LuPencil />
          </IconButton>
          <IconButton
            aria-label={jobSearch.archived ? "Unarchive" : "Archive"}
            title={jobSearch.archived ? "Unarchive" : "Archive"}
            size="xs"
            variant="ghost"
            color="fg.subtle"
            _hover={{ color: "fg" }}
            onClick={() => onToggleArchive(jobSearch)}
          >
            {jobSearch.archived ? <LuArchiveRestore /> : <LuArchive />}
          </IconButton>
          <IconButton
            aria-label="Delete"
            title="Delete"
            size="xs"
            variant="ghost"
            colorPalette="red"
            color="fg.subtle"
            _hover={{ color: "fg.error" }}
            onClick={() => onDelete(jobSearch)}
          >
            <LuTrash2 />
          </IconButton>
        </Flex>
      )}
    </Flex>
  );
}

interface ManageJobSearchesDialogProps {
  jobSearches: JobSearchRead[];
  onUpdate: (id: number, data: JobSearchUpdate) => Promise<void>;
  onToggleArchive: (jobSearch: JobSearchRead) => Promise<void>;
  onDelete: (jobSearch: JobSearchRead) => Promise<void>;
  onClose: () => void;
}

export function ManageJobSearchesDialog({
  jobSearches,
  onUpdate,
  onToggleArchive,
  onDelete,
  onClose,
}: ManageJobSearchesDialogProps) {
  return (
    <Dialog.Root open onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Manage Job Searches</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {jobSearches.length === 0 ? (
                <Text textStyle="sm" color="fg.muted">
                  No job searches yet.
                </Text>
              ) : (
                <Stack gap="0">
                  {jobSearches.map((js) => (
                    <JobSearchRow
                      key={js.id}
                      jobSearch={js}
                      onUpdate={onUpdate}
                      onToggleArchive={onToggleArchive}
                      onDelete={onDelete}
                    />
                  ))}
                </Stack>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Button onClick={onClose} variant="ghost">
                Close
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
