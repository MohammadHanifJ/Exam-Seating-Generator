import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";

export default function AdminLayout({ onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} onLogout={onLogout} />
      <div className="md:pl-64">
        <div className="flex items-center justify-between border-b border-orange-100 bg-white/90 px-6 py-4 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-700"
          >
            Menu
          </button>
          <span className="text-sm font-semibold text-slate-900">SRIT Admin</span>
        </div>
        <main className="px-6 pb-16 pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
