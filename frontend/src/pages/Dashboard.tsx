import { useAuth } from "../context/AuthContext";

export function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Job Application Tracker</h1>
        <button
          onClick={logout}
          className="bg-gray-200 rounded px-3 py-2 font-semibold"
        >
          Log Out
        </button>
      </div>
      <p>Signed in as {user?.email}</p>
    </div>
  );
}
