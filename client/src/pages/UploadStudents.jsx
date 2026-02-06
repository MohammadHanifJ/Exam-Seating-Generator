import { useEffect, useMemo, useState } from "react";
import {
  uploadStudents,
  getStudents,
  approveStudent,
  blockStudent,
  approveAllStudents,
  getBranches
} from "../api.js";

const filters = ["All", "Approved", "Blocked", "Pending"];

export default function UploadStudents() {
  const [tab, setTab] = useState("Upload");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState("All");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({ total: 0, approved: 0, blocked: 0, pending: 0 });

  const loadStudents = async () => {
    const status =
      filter === "Approved" ? "approved" : filter === "Blocked" ? "blocked" : filter === "Pending" ? "pending" : "";
    try {
      const data = await getStudents({
        branch: branch || undefined,
        year: year || undefined,
        status: status || undefined
      });
      setStudents(data);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
      setStudents([]);
    }
  };

  const loadCounts = async () => {
    try {
      const all = await getStudents();
      const approved = all.filter((s) => s.approved).length;
      const blocked = all.filter((s) => s.blocked).length;
      const pending = all.filter((s) => !s.approved && !s.blocked).length;
      setCounts({ total: all.length, approved, blocked, pending });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
      setCounts({ total: 0, approved: 0, blocked: 0, pending: 0 });
    }
  };

  useEffect(() => {
    getBranches("").then(setBranches).catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    if (tab !== "Review & Approve") return;
    loadStudents();
  }, [tab, filter, branch, year]);

  useEffect(() => {
    if (tab !== "Review & Approve") return;
    loadCounts();
  }, [tab]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.trim().toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.roll_no.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q)
    );
  }, [students, search]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setStatus(null);
    try {
      const result = await uploadStudents(file);
      setStatus({ type: "success", message: `Inserted: ${result.inserted}, Rejected: ${result.rejected}` });
      setTab("Review & Approve");
      await loadStudents();
      await loadCounts();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const onApprove = async (id) => {
    setStatus(null);
    try {
      await approveStudent(id);
      await loadStudents();
      await loadCounts();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const onBlock = async (id) => {
    const ok = window.confirm("Block this student from the exam?");
    if (!ok) return;
    setStatus(null);
    try {
      await blockStudent(id);
      await loadStudents();
      await loadCounts();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const onApproveAll = async () => {
    const ok = window.confirm("Approve all students?");
    if (!ok) return;
    setStatus(null);
    try {
      const res = await approveAllStudents();
      setStatus({ type: "success", message: `Approved ${res.updated ?? 0} students.` });
      await loadStudents();
      await loadCounts();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  return (
    <section className="glass rounded-3xl p-8 md:p-10 card-ring">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-display font-semibold text-slate-900">Upload & Review Students</h2>
          <p className="text-slate-600 text-xs">Upload CSV/Excel and approve or block students before seating generation.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["Upload", "Review & Approve"].map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`rounded-full px-4 py-2 text-[11px] font-semibold border ${
                tab === item ? "bg-orange-600 text-white border-orange-600" : "border-orange-200 text-orange-700"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "Upload" && (
          <div className="rounded-2xl border border-orange-100 bg-white/80 p-6">
            <div className="max-w-2xl">
              <h3 className="text-sm font-semibold text-slate-900">Upload Student Data</h3>
              <p className="text-slate-600 mt-2 text-xs">Duplicate roll numbers are ignored.</p>
            </div>
            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => setFile(e.target.files[0])}
                className="block w-full rounded-xl border border-orange-200 bg-white/90 px-4 py-3 text-xs text-slate-700"
              />
              <button
                type="submit"
                disabled={!file || loading}
                className="rounded-xl bg-orange-600 px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-orange-600/20 disabled:opacity-50"
              >
                {loading ? "Uploading..." : "Upload"}
              </button>
            </form>
          </div>
        )}

        {tab === "Review & Approve" && (
          <div className="rounded-2xl border border-orange-100 bg-white/80 p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Review & Approve</h3>
                  <p className="text-slate-600 mt-1 text-xs">Approve students to include them in seating.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-orange-200 px-3 py-1 text-orange-700">
                    Total: {counts.total}
                  </span>
                  <span className="rounded-full border border-emerald-200 px-3 py-1 text-emerald-700">
                    Approved: {counts.approved}
                  </span>
                  <span className="rounded-full border border-rose-200 px-3 py-1 text-rose-700">
                    Blocked: {counts.blocked}
                  </span>
                  <span className="rounded-full border border-amber-200 px-3 py-1 text-amber-700">
                    Pending: {counts.pending}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {filters.map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold border ${
                      filter === item ? "bg-orange-600 text-white border-orange-600" : "border-orange-200 text-orange-700"
                    }`}
                  >
                    {item}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setStatus(null);
                    loadStudents();
                    loadCounts();
                  }}
                  className="rounded-full px-4 py-2 text-xs font-semibold border border-orange-200 text-orange-700"
                >
                  Refresh
                </button>
                <button
                  onClick={onApproveAll}
                  className="rounded-full px-4 py-2 text-xs font-semibold border border-emerald-200 text-emerald-700"
                >
                  Approve All
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
                >
                  <option value="">All Years</option>
                  {["1", "2", "3", "4"].map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
                <div className="rounded-xl border border-orange-100 bg-white/80 px-4 py-2 text-xs text-slate-600">
                  Status: {filter}
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, roll no, or branch"
                  className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
                />
              </div>

              {status && (
                <div
                  className={`rounded-2xl px-4 py-3 text-xs ${
                    status.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                  }`}
                >
                  {status.message}
                </div>
              )}

            <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                        <th className="py-2">Name</th>
                        <th className="py-2">Roll No</th>
                        <th className="py-2">Branch</th>
                        <th className="py-2">Year</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-4 text-slate-500">
                            No students to show.
                          </td>
                        </tr>
                      )}
                      {filtered.map((student) => {
                        const statusLabel = student.approved ? "Approved" : student.blocked ? "Blocked" : "Pending";
                        const statusClass = student.approved
                          ? "text-emerald-700"
                          : student.blocked
                          ? "text-rose-700"
                          : "text-amber-700";
                        return (
                          <tr key={student.id} className="border-t border-orange-100 text-slate-700">
                            <td className="py-2">{student.name}</td>
                            <td className="py-2">{student.roll_no}</td>
                            <td className="py-2">{student.branch}</td>
                            <td className="py-2">Year {student.year}</td>
                            <td className={`py-2 font-semibold ${statusClass}`}>{statusLabel}</td>
                            <td className="py-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => onApprove(student.id)}
                                className="rounded-full border border-emerald-200 px-3 py-1 text-xs text-emerald-700"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => onBlock(student.id)}
                                className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-700"
                              >
                                Block
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {status && tab === "Upload" && (
          <div
            className={`rounded-2xl px-4 py-3 text-xs ${
              status.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
            }`}
          >
            {status.message}
          </div>
        )}
      </div>
    </section>
  );
}


