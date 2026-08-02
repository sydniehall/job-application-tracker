import { useLayoutEffect, useRef, useState } from "react";
import {
  CloseButton,
  DataList,
  Dialog,
  Flex,
  IconButton,
  Link,
  Portal,
  Text,
} from "@chakra-ui/react";
import { LuExternalLink, LuFileText } from "react-icons/lu";
import { StatusBadge } from "./StatusBadge";
import type { ApplicationRead } from "../index";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("T")[0].split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

// created_at/updated_at come from SQLite's CURRENT_TIMESTAMP: UTC, but
// serialized without a timezone marker. Append "Z" so the Date parses as
// UTC, then render in the viewer's local time with the timezone name.
function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const iso = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const d = new Date(iso);
  const date = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
  return `${date}, ${time}`;
}

interface ApplicationDetailsProps {
  application: ApplicationRead;
  onClose: () => void;
  onOpenNote: () => void;
}

export function ApplicationDetails({
  application,
  onClose,
  onOpenNote,
}: ApplicationDetailsProps) {
  const notesRef = useRef<HTMLParagraphElement>(null);
  const [isNotesTruncated, setIsNotesTruncated] = useState(false);

  // The note is clamped to one line — the "view note" button only makes
  // sense (and only appears) when that clamp actually cut something off.
  useLayoutEffect(() => {
    const el = notesRef.current;
    setIsNotesTruncated(Boolean(el && el.scrollHeight > el.clientHeight + 1));
  }, [application.notes]);

  return (
    <Dialog.Root open onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Application Details</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <DataList.Root orientation="horizontal">
                <DataList.Item>
                  <DataList.ItemLabel>Job Title</DataList.ItemLabel>
                  <DataList.ItemValue>{application.title}</DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Company</DataList.ItemLabel>
                  <DataList.ItemValue>{application.company}</DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Location</DataList.ItemLabel>
                  <DataList.ItemValue color={application.location ? undefined : "fg.subtle"}>
                    {application.location || "—"}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Pay</DataList.ItemLabel>
                  <DataList.ItemValue color={application.pay ? undefined : "fg.subtle"}>
                    {application.pay || "—"}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Type</DataList.ItemLabel>
                  <DataList.ItemValue color={application.type ? undefined : "fg.subtle"}>
                    {application.type || "—"}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Status</DataList.ItemLabel>
                  <DataList.ItemValue>
                    <StatusBadge status={application.status} />
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>URL</DataList.ItemLabel>
                  <DataList.ItemValue color={application.url ? undefined : "fg.subtle"}>
                    {application.url ? (
                      <Link
                        href={application.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="blue.fg"
                        wordBreak="break-all"
                      >
                        {application.url}
                        <LuExternalLink size={12} style={{ flexShrink: 0 }} />
                      </Link>
                    ) : (
                      "—"
                    )}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Date Applied</DataList.ItemLabel>
                  <DataList.ItemValue color={application.date_applied ? undefined : "fg.subtle"}>
                    {formatDate(application.date_applied)}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Deadline</DataList.ItemLabel>
                  <DataList.ItemValue color={application.deadline ? undefined : "fg.subtle"}>
                    {formatDate(application.deadline)}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Notes</DataList.ItemLabel>
                  <DataList.ItemValue>
                    <Flex align="center" gap="2">
                      <Text
                        ref={notesRef}
                        lineClamp="1"
                        color={application.notes ? undefined : "fg.subtle"}
                      >
                        {application.notes || "—"}
                      </Text>
                      {isNotesTruncated && (
                        <IconButton
                          onClick={onOpenNote}
                          aria-label="View note"
                          title="View note"
                          variant="ghost"
                          size="2xs"
                          color="fg.subtle"
                          _hover={{ color: "fg" }}
                          flexShrink="0"
                        >
                          <LuFileText />
                        </IconButton>
                      )}
                    </Flex>
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Resume Version</DataList.ItemLabel>
                  <DataList.ItemValue color={application.resume_version ? undefined : "fg.subtle"}>
                    {application.resume_version || "—"}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Created</DataList.ItemLabel>
                  <DataList.ItemValue color={application.created_at ? undefined : "fg.subtle"}>
                    {formatDateTime(application.created_at)}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Last Updated</DataList.ItemLabel>
                  <DataList.ItemValue color={application.updated_at ? undefined : "fg.subtle"}>
                    {formatDateTime(application.updated_at)}
                  </DataList.ItemValue>
                </DataList.Item>
              </DataList.Root>
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
