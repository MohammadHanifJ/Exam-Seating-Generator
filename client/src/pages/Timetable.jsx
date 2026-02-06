import { useEffect, useState } from "react";
import { addTimetable, deleteTimetable, getBranches, getTimetables } from "../api.js";

const examTypes = ["MID", "SEMESTER"];

export default function Timetable() {
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ department: "", year: "2", examType: "SEMESTER" });
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    department: "",
    year: "2",
    subject_name: "",
    exam_date: "",
    start_time: "",
    end_time: "",
    exam_type: "SEMESTER"
  });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    getBranches(filters.year).then(setBranches).catch(() => setBranches([]));
  }, [filters.year]);

  const load = async () => {
    const data = await getTimetables({
      department: filters.department || undefined,
      year: filters.year,
      examType: filters.examType
    });
    setEntries(data);
  };

  useEffect(() => {
    load().catch(() => setEntries([]));
  }, [filters.department, filters.year, filters.examType]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);
    try {
      await addTimetable(form);
      setStatus({ type: "success", message: "Timetable entry added." });
      await load();
      setForm({ ...form, subject_name: "", exam_date: "", start_time: "", end_time: "" });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const onDelete = async (id) => {
    await deleteTimetable(id);
    await load();
  };

  return (
    <section className="glass rounded-3xl p-8 md:p-10 card-ring">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-display font-semibold text-slate-900">Timetable Management</h2>
          <p className="text-slate-600 mt-2 text-xs">Create and manage department-wise exam schedules.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Filter</p>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="mt-3 w-full rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
            >
              <option value="">All Departments</option>
              {branches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="mt-3 w-full rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
            >
              {["1", "2", "3", "4"].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
            <div className="mt-3 flex gap-2">
              {examTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilters({ ...filters, examType: type })}
                  className={`px-4 py-2 rounded-full text-xs border ${
                    filters.examType === type
                      ? "bg-orange-600 text-white border-orange-600"
                      : "border-orange-200 text-orange-700"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={onSubmit} className="md:col-span-2 rounded-2xl border border-orange-100 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Add Entry</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
                required
              >
                <option value="">Department</option>
                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
              <select
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
                required
              >
                {["1", "2", "3", "4"].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
              <select
                value={form.exam_type}
                onChange={(e) => setForm({ ...form, exam_type: e.target.value })}
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
              >
                {examTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                value={form.subject_name}
                onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
                placeholder="Subject"
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs md:col-span-2"
                required
              />
              <input
                type="date"
                value={form.exam_date}
                onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
                required
              />
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
                required
              />
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
                required
              />
              <button
                type="submit"
                className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Save Entry
              </button>
            </div>
          </form>
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
                  <th className="py-2">Department</th>
                  <th className="py-2">Year</th>
                  <th className="py-2">Subject</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Time</th>
                  <th className="py-2">Type</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-4 text-slate-500">
                      No timetable entries.
                    </td>
                  </tr>
                )}
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-orange-100 text-slate-700">
                    <td className="py-2">{entry.department}</td>
                    <td className="py-2">Year {entry.year}</td>
                    <td className="py-2">{entry.subject_name}</td>
                    <td className="py-2">{entry.exam_date}</td>
                    <td className="py-2">
                      {entry.start_time} - {entry.end_time}
                    </td>
                    <td className="py-2">{entry.exam_type}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => onDelete(entry.id)}
                        className="rounded-full border border-orange-200 px-3 py-1 text-xs text-orange-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}


