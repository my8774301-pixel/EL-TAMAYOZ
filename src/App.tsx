import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import StudentAuth from "./pages/StudentAuth";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import { useAuth } from "./lib/auth";

export default function App() {
  const { loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted">Loading…</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          profile ? (
            <Navigate to={profile.role === "teacher" ? "/teacher" : "/student"} replace />
          ) : (
            <Landing />
          )
        }
      />
      <Route path="/auth/:role" element={profile ? <Navigate to="/" replace /> : <StudentAuth />} />
      <Route
        path="/student"
        element={profile?.role === "student" ? <StudentDashboard /> : <Navigate to="/" replace />}
      />
      <Route
        path="/teacher"
        element={profile?.role === "teacher" ? <TeacherDashboard /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
