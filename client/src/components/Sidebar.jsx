import { NavLink } from "react-router-dom";

const items = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/upload", label: "Upload Students" },
  { to: "/generate", label: "Generate Seating" },
  { to: "/preview", label: "Seating Preview" }
];

export default function Sidebar({ open, onClose, onLogout }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 md:hidden" onClick={onClose} />}
      <aside
        style={{ top: "var(--header-offset)", height: "calc(100% - var(--header-offset))" }}
        className={`fixed left-0 w-64 transform border-r border-orange-100 bg-white/95 shadow-xl transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="px-6 py-6">
            <h2 className="text-sm font-display font-semibold text-slate-900">Admin Dashboard</h2>
            <p className="text-xs text-slate-500">SRIT Examination Portal</p>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-6">
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 text-xs font-semibold ${
                      isActive ? "bg-orange-100 text-orange-800" : "text-slate-700 hover:bg-orange-50"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="mt-6 w-full rounded-xl border border-orange-200 px-4 py-3 text-xs font-semibold text-orange-700 hover:bg-orange-50"
            >
              Logout
            </button>
          </nav>
        </div>
      </aside>
    </>
  );
}

