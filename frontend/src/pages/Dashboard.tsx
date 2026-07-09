import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createApplication,
  deleteApplication,
  getApplications,
  updateApplication,
} from "../api/applications";
import { StatusBadge } from "../components/StatusBadge";
import { ApplicationForm } from "../components/ApplicationForm";
import { ApplicationStatus } from "../index";
import type { ApplicationRead } from "../index";

const STATUS_CYCLE: ApplicationStatus[] = [
  ApplicationStatus.Applied,
  ApplicationStatus.Screening,
  ApplicationStatus.Interview,
  ApplicationStatus.ToApply,
];

function nextStatus(current: ApplicationStatus): ApplicationStatus {
  const index = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length];
}

function formatDate(dateApplied: string | null): string {
  if (!dateApplied) return "—";
  const [year, month, day] = dateApplied.split("T")[0].split("-");
  return `${month}/${day}/${year}`;
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState<ApplicationRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    getApplications()
      .then(setApplications)
      .catch(() => setError("Could not load applications."))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleAdd(data: Parameters<typeof createApplication>[0]) {
    const application = await createApplication(data);
    setApplications((prev) => [application, ...prev]);
    setIsAdding(false);
  }

  async function handleEdit(id: number, data: Parameters<typeof updateApplication>[1]) {
    const updated = await updateApplication(id, data);
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    setEditingId(null);
  }

  async function handleSetStatus(app: ApplicationRead, status: ApplicationStatus) {
    const updated = await updateApplication(app.id, { status });
    setApplications((prev) => prev.map((a) => (a.id === app.id ? updated : a)));
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this application?")) return;
    await deleteApplication(id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-semibold">Job Applications</h1>
            <p className="text-sm text-gray-500">
              {user?.email} · {applications.length} application
              {applications.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Log out
          </button>
        </div>

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full mb-4 border-2 border-dashed border-gray-300 rounded-lg py-4 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600"
          >
            + Add Application
          </button>
        )}

        {isAdding && (
          <ApplicationForm
            submitLabel="Add"
            onSubmit={handleAdd}
            onCancel={() => setIsAdding(false)}
          />
        )}

        {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isLoading && !error && applications.length === 0 && (
          <p className="text-sm text-gray-500">No applications yet.</p>
        )}

        {!isLoading && !error && applications.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm divide-y">
            {applications.map((app) =>
              editingId === app.id ? (
                <div key={app.id} className="p-4">
                  <ApplicationForm
                    initial={app}
                    submitLabel="Save"
                    onSubmit={(data) => handleEdit(app.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div
                  key={app.id}
                  className="flex items-center justify-between px-4 py-3 group"
                >
                  <button
                    onClick={() => setEditingId(app.id)}
                    className="text-left flex-1"
                  >
                    <p className="font-medium">{app.company}</p>
                    <p className="text-sm text-gray-500">{app.role}</p>
                  </button>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">
                      {formatDate(app.date_applied)}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleSetStatus(app, ApplicationStatus.Offer)}
                        className="text-xs font-medium text-green-600 hover:underline"
                      >
                        Offer
                      </button>
                      <button
                        onClick={() => handleSetStatus(app, ApplicationStatus.Rejected)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Rejection
                      </button>
                    </div>
                    <StatusBadge
                      status={app.status}
                      onClick={() => handleSetStatus(app, nextStatus(app.status))}
                    />
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="text-sm text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
