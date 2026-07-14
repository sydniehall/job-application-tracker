import { Badge } from "@chakra-ui/react";
import { ApplicationStatus } from "../index";

const PALETTES: Record<ApplicationStatus, string> = {
  [ApplicationStatus.ToApply]: "gray",
  [ApplicationStatus.Applied]: "blue",
  [ApplicationStatus.Screening]: "purple",
  [ApplicationStatus.Interview]: "orange",
  [ApplicationStatus.Offer]: "green",
  [ApplicationStatus.Rejected]: "red",
  [ApplicationStatus.Withdrawn]: "gray",
};

interface StatusBadgeProps {
  status: ApplicationStatus;
  onClick?: () => void;
}

export function StatusBadge({ status, onClick }: StatusBadgeProps) {
  return (
    <Badge
      asChild
      colorPalette={PALETTES[status]}
      variant={status === ApplicationStatus.ToApply ? "outline" : "subtle"}
      rounded="full"
      cursor={onClick ? "pointer" : "default"}
      _hover={onClick ? { opacity: 0.75 } : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        title={onClick ? "Click to advance status" : undefined}
      >
        {status}
      </button>
    </Badge>
  );
}
