import { useState } from "react";
import type { SubmitEvent } from "react";
import { ApplicationStatus } from "../index";
import type { ApplicationCreate } from "../index";

interface ApplicationFormProps {
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
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: ApplicationFormProps) {
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
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-sm p-4 mb-4 space-y-3"
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
          autoFocus
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-3">
        <label className="flex-1 text-xs text-gray-500">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
            className="w-full border rounded px-3 py-2 text-sm text-gray-900 mt-1"
          >
            {Object.values(ApplicationStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-3">
        <label className="flex-1 text-xs text-gray-500">
          Applied Date
          <input
            type="date"
            value={isToApply ? "" : dateApplied ?? ""}
            onChange={(e) => setDateApplied(e.target.value)}
            disabled={isToApply}
            className="w-full border rounded px-3 py-2 text-sm text-gray-900 mt-1 disabled:bg-gray-100 disabled:text-gray-400"
          />
        </label>
        <label className="flex-1 text-xs text-gray-500">
          Deadline
          <input
            type="date"
            value={deadline ?? ""}
            onChange={(e) => setDeadline(e.target.value)}
            onFocus={() => setDeadlineFocused(true)}
            onBlur={() => setDeadlineFocused(false)}
            className={`w-full border rounded px-3 py-2 text-sm text-gray-900 mt-1 ${
              !deadline && !deadlineFocused
                ? "[&::-webkit-datetime-edit]:text-transparent"
                : ""
            }`}
          />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 px-3 py-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white rounded px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
