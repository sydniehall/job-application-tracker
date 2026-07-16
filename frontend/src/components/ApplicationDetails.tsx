import {
  CloseButton,
  DataList,
  Dialog,
  Link,
  Portal,
} from "@chakra-ui/react";
import { LuExternalLink } from "react-icons/lu";
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
}

export function ApplicationDetails({
  application,
  onClose,
}: ApplicationDetailsProps) {
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
                  <DataList.ItemLabel>Role</DataList.ItemLabel>
                  <DataList.ItemValue>{application.role}</DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Company</DataList.ItemLabel>
                  <DataList.ItemValue>{application.company}</DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Location</DataList.ItemLabel>
                  <DataList.ItemValue>
                    {application.location || "—"}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Pay</DataList.ItemLabel>
                  <DataList.ItemValue>
                    {application.pay || "—"}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Type</DataList.ItemLabel>
                  <DataList.ItemValue>
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
                  <DataList.ItemValue>
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
                  <DataList.ItemValue>
                    {formatDate(application.date_applied)}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Deadline</DataList.ItemLabel>
                  <DataList.ItemValue>
                    {formatDate(application.deadline)}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Notes</DataList.ItemLabel>
                  <DataList.ItemValue>
                    {application.notes || "—"}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Resume Version</DataList.ItemLabel>
                  <DataList.ItemValue>
                    {application.resume_version || "—"}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Created</DataList.ItemLabel>
                  <DataList.ItemValue>
                    {formatDateTime(application.created_at)}
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Last Updated</DataList.ItemLabel>
                  <DataList.ItemValue>
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
