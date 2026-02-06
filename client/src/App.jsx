import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import UploadStudents from "./pages/UploadStudents.jsx";
import Generate from "./pages/Generate.jsx";
import Preview from "./pages/Preview.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ReviewStudents from "./pages/ReviewStudents.jsx";

export default function App() {
  const navigate = useNavigate();

  const onGenerated = (batchId) => {
    navigate(`/preview?batch=${batchId}`);
  };

  const onLogout = () => {
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminToken");
  };

  return (
    <div className="min-h-screen grid-bg">
      <header className="shadow-sm">
        <div className="top-bar px-6 py-2 text-xs">
          <div className="max-w-6xl mx-auto flex items-center justify-end">
            <span className="rounded-full bg-white/20 px-4 py-1 text-xs font-semibold text-white">
              Admin Console
            </span>
          </div>
        </div>

        <div className="brand-bar px-6 py-6">
          <div className="max-w-6xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 bg-white shadow-md border border-orange-200 flex items-center justify-center overflow-hidden">
                <img src="/srit-logo.png" alt="SRIT logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-orange-600">Autonomous</p>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900">
                  Srinivasa Ramanujan Institute of Technology
                </h1>
                <p className="text-sm text-slate-600">Rotarypuram Village, Ananthapuramu - 515701</p>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-orange-600">Exam Seating Administration</p>
              <p>Accredited by NBA & NAAC with “A” Grade</p>
            </div>
          </div>
        </div>
      </header>

      <Routes>
        <Route element={<AdminLayout onLogout={onLogout} />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<UploadStudents />} />
          <Route path="/review" element={<ReviewStudents />} />
          <Route path="/generate" element={<Generate onGenerated={onGenerated} />} />
          <Route path="/preview" element={<Preview />} />
        </Route>
      </Routes>
    </div>
  );
}
