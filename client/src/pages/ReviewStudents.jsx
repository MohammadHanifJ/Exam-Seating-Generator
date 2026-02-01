import { useEffect, useMemo, useState } from "react";
import { approveAllStudents, approveStudent, blockStudent, getStudents, getBranches } from "../api.js";

const filters = ["All", "Approved", "Blocked", "Pending"];

export default function ReviewStudents() {
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState("All");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(null);
  const [counts, setCounts] = useState({ total: 0, approved: 0, blocked: 0, pending: 0 });

  const load = async () => {
    const status =
      filter === "Approved" ? "approved" : filter === "Blocked" ? "blocked" : filter === "Pending" ? "pending" : "";
    const data = await getStudents({
      branch: branch || undefined,
      year: year || undefined,
      status: status || undefined
    });
    setStudents(data);
  };

  const loadCounts = async () => {
    const all = await getStudents();
    const approved = all.filter((s) => s.approved).length;
    const blocked = all.filter((s) => s.blocked).length;
    const pending = all.filter((s) => !s.approved && !s.blocked).length;
    setCounts({ total: all.length, approved, blocked, pending });
  };

  useEffect(() => {
    getBranches("").then(setBranches).catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    load().catch(() => setStudents([]));
  }, [filter, branch, year]);

  useEffect(() => {
    loadCounts().catch(() => setCounts({ total: 0, approved: 0, blocked: 0, pending: 0 }));
  }, []);

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

  // counts are loaded from all students, filters apply only to the table.

  const onApprove = async (id) => {
    setStatus(null);
    try {
      await approveStudent(id);
      await load();
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
      await load();
      await loadCounts();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  return (
    <section className="glass rounded-3xl p-8 md:p-10 card-ring">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-display font-semibold text-slate-900">Review Students</h2>
            <p className="text-slate-600 mt-2">Approve or block students before seating generation.</p>
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
                filter === item
                  ? "bg-orange-600 text-white border-orange-600"
                  : "border-orange-200 text-orange-700"
              }`}
            >
              {item}
            </button>
          ))}
          <button
            onClick={async () => {
              const ok = window.confirm("Approve all students?");
              if (!ok) return;
              setStatus(null);
              try {
                const res = await approveAllStudents();
                setStatus({ type: "success", message: `Approved ${res.updated ?? 0} students.` });
                await load();
                await loadCounts();
              } catch (err) {
                setStatus({ type: "error", message: err.message });
              }
            }}
            className="rounded-full px-4 py-2 text-xs font-semibold border border-emerald-200 text-emerald-700"
          >
            Approve All
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-sm"
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
            className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-sm"
          >
            <option value="">All Years</option>
            {["1", "2", "3", "4"].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
          <div className="rounded-xl border border-orange-100 bg-white/80 px-4 py-2 text-sm text-slate-600">
            Status: {filter}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, roll no, or branch"
            className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-sm"
          />
        </div>

        {status && (
          <div className="rounded-2xl px-4 py-3 text-sm bg-orange-50 text-orange-700">{status.message}</div>
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
    </section>
  );
}
