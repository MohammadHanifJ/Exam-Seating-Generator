import { useState } from "react";
import { uploadStudents } from "../api.js";

export default function UploadStudents() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setStatus(null);
    try {
      const result = await uploadStudents(file);
      setStatus({ type: "success", message: `Inserted: ${result.inserted}, Rejected: ${result.rejected}` });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass rounded-3xl p-8 md:p-10 card-ring">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-display font-semibold text-slate-900">Upload Students</h2>
          <p className="text-slate-600 text-sm">Upload CSV/Excel student lists for approval and seating.</p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white/80 p-6">
          <div className="max-w-2xl">
            <h3 className="text-base font-semibold text-slate-900">Upload Student Data</h3>
            <p className="text-slate-600 mt-2 text-sm">Duplicate roll numbers are ignored.</p>
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

        {status && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
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
