import { ApplicationStatus } from "../index";

const COLORS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.ToApply]: "bg-slate-100 text-slate-600",
  [ApplicationStatus.Applied]: "bg-blue-100 text-blue-700",
  [ApplicationStatus.Screening]: "bg-purple-100 text-purple-700",
  [ApplicationStatus.Interview]: "bg-amber-100 text-amber-700",
  [ApplicationStatus.Offer]: "bg-green-100 text-green-700",
  [ApplicationStatus.Rejected]: "bg-red-100 text-red-700",
  [ApplicationStatus.Withdrawn]: "bg-gray-100 text-gray-600",
};

interface StatusBadgeProps {
  status: ApplicationStatus;
  onClick?: () => void;
}

export function StatusBadge({ status, onClick }: StatusBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={onClick ? "Click to advance status" : undefined}
      className={`text-xs font-medium px-2 py-1 rounded-full ${COLORS[status]} ${
        onClick ? "cursor-pointer hover:opacity-75" : "cursor-default"
      }`}
    >
      {status}
    </button>
  );
}
