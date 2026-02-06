import { useEffect, useState } from "react";
import { getSeating, pdfUrl, sendEmail } from "../api.js";
import SeatGrid from "../components/SeatGrid.jsx";

const parseSeat = (label) => {
  const match = String(label || "").match(/^([A-Z]+)(\d+)$/);
  if (!match) return { col: "", row: 0 };
  return { col: match[1], row: Number(match[2]) };
};

const columnToIndex = (col) => {
  let index = 0;
  for (let i = 0; i < col.length; i += 1) {
    index = index * 26 + (col.charCodeAt(i) - 64);
  }
  return index - 1;
};

const buildSeatOrder = (seats) =>
  [...new Set(seats.map((seat) => seat.seat_label))].sort((a, b) => {
    const aParsed = parseSeat(a);
    const bParsed = parseSeat(b);
    const colDiff = columnToIndex(aParsed.col) - columnToIndex(bParsed.col);
    if (colDiff !== 0) return colDiff;
    return aParsed.row - bParsed.row;
  });

export default function Preview() {
  const [batchId, setBatchId] = useState("");
  const [rooms, setRooms] = useState([]);
  const [status, setStatus] = useState(null);
  const [email, setEmail] = useState("");
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const batch = params.get("batch");
    if (batch) {
      setBatchId(batch);
    }
  }, []);

  useEffect(() => {
    if (!batchId) return;
    getSeating(batchId)
      .then((res) => {
        setRooms(res.rooms || []);
        setSummary({
          assigned: res.assignedStudents,
          unassigned: res.unassignedStudents,
          emptySeats: res.emptySeats,
          totalSeats: res.totalSeats,
          seatsFilled: res.seatsFilled
        });
      })
      .catch((err) => setStatus({ type: "error", message: err.message }));
  }, [batchId]);

  const load = async () => {
    try {
      const res = await getSeating(batchId);
      setRooms(res.rooms || []);
      setSummary({
        assigned: res.assignedStudents,
        unassigned: res.unassignedStudents,
        emptySeats: res.emptySeats,
        totalSeats: res.totalSeats,
        seatsFilled: res.seatsFilled
      });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const onSend = async () => {
    setStatus(null);
    try {
      await sendEmail(
        batchId,
        email
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      );
      setStatus({ type: "success", message: "Email sent" });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  return (
    <section className="glass rounded-3xl p-8 md:p-10 card-ring">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-display font-semibold text-slate-900">Seating Preview</h2>
          <p className="text-slate-600 mt-2 text-xs">View seating grid and export PDFs.</p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white/80 px-4 py-3 text-xs text-slate-600">
          <span>Batch loaded from generation flow.</span>
          <button onClick={load} className="rounded-full bg-orange-600 px-4 py-2 text-[11px] font-semibold text-white">
            Refresh
          </button>
        </div>

        {summary && (
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
              <p className="text-[11px] text-slate-500">Total Seats</p>
              <p className="text-base font-semibold text-slate-900">{summary.totalSeats ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
              <p className="text-[11px] text-slate-500">Seats Filled</p>
              <p className="text-base font-semibold text-slate-900">{summary.seatsFilled ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
              <p className="text-[11px] text-slate-500">Empty Seats</p>
              <p className="text-base font-semibold text-slate-900">{summary.emptySeats ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
              <p className="text-[11px] text-slate-500">Students Unassigned</p>
              <p className="text-base font-semibold text-slate-900">{summary.unassigned ?? "-"}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 lg:flex-row">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Emails (comma-separated)"
            className="flex-1 rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
          />
          <button onClick={onSend} className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white">
            Send PDF
          </button>
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

        {rooms.length === 0 && <p className="text-slate-500 text-xs">No seating data loaded.</p>}

        {rooms.length > 0 && (
          <div className="flex justify-end">
            <a
              href={pdfUrl(batchId)}
              target="_blank"
              rel="noreferrer"
            className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Open Combined PDF
          </a>
        </div>
      )}

        {rooms.map((room) => (
          <div key={room.room_no} className="rounded-2xl border border-orange-100 bg-white/70 p-6">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Room {room.room_no}</h3>
                <p className="text-[11px] text-slate-500">
                  {room.exam_type} exam | Year {room.year}
                </p>
                {room.invigilators?.length > 0 && (
                  <p className="text-[11px] text-slate-500">
                    Invigilators:{" "}
                    {room.invigilators.map((inv) => `${inv.name}${inv.designation ? ` (${inv.designation})` : ""}`).join(", ")}
                  </p>
                )}
              </div>
              <a
                href={pdfUrl(batchId, room.room_no)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-orange-300 px-4 py-2 text-xs text-orange-700"
              >
                Open Room PDF
              </a>
            </div>
            <div className="mt-4">
              <SeatGrid seats={room.seats} examType={room.exam_type} />
            </div>
            <div className="mt-6 overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                    {room.exam_type === "MID" ? (
                      <>
                        <th className="py-2">Seat</th>
                        <th className="py-2">Name 1</th>
                        <th className="py-2">Roll 1</th>
                        <th className="py-2">Branch 1</th>
                        <th className="py-2">Name 2</th>
                        <th className="py-2">Roll 2</th>
                        <th className="py-2">Branch 2</th>
                        <th className="py-2">Room</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2">Seat</th>
                        <th className="py-2">Name</th>
                        <th className="py-2">Roll</th>
                        <th className="py-2">Branch</th>
                        <th className="py-2">Year</th>
                        <th className="py-2">Room</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {buildSeatOrder(room.seats || []).map((label) => {
                    const seat = room.seats.find((s) => s.seat_label === label);
                    if (room.exam_type === "MID") {
                      const s1 = seat?.student_one;
                      const s2 = seat?.student_two;
                      return (
                        <tr key={`${room.room_no}-${label}`} className="border-t border-orange-100 text-slate-700">
                          <td className="py-2">{label}</td>
                          <td className="py-2">{s1?.name || "EMPTY"}</td>
                          <td className="py-2">{s1?.roll_no || "-"}</td>
                          <td className="py-2">{s1?.branch || "-"}</td>
                          <td className="py-2">{s2?.name || "EMPTY"}</td>
                          <td className="py-2">{s2?.roll_no || "-"}</td>
                          <td className="py-2">{s2?.branch || "-"}</td>
                          <td className="py-2">{room.room_no}</td>
                        </tr>
                      );
                    }
                    const s1 = seat?.student_one;
                    return (
                      <tr key={`${room.room_no}-${label}`} className="border-t border-orange-100 text-slate-700">
                        <td className="py-2">{label}</td>
                        <td className="py-2">{s1?.name || "EMPTY"}</td>
                        <td className="py-2">{s1?.roll_no || "-"}</td>
                        <td className="py-2">{s1?.branch || "-"}</td>
                        <td className="py-2">{s1?.year || "-"}</td>
                        <td className="py-2">{room.room_no}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


