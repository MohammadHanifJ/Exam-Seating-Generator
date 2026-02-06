import clsx from "clsx";

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

const branchColors = [
  "bg-orange-100/80 border-orange-200 text-orange-800",
  "bg-amber-100/80 border-amber-200 text-amber-800",
  "bg-rose-100/80 border-rose-200 text-rose-800",
  "bg-emerald-100/80 border-emerald-200 text-emerald-800",
  "bg-teal-100/80 border-teal-200 text-teal-800",
  "bg-sky-100/80 border-sky-200 text-sky-800",
  "bg-violet-100/80 border-violet-200 text-violet-800"
];

export default function SeatGrid({ seats, examType }) {
  const branchMap = new Map();
  let colorIndex = 0;
  const seatMap = new Map(seats.map((seat) => [seat.seat_label, seat]));
  const sortedLabels = [...new Set(seats.map((seat) => seat.seat_label))].sort((a, b) => {
    const aParsed = parseSeat(a);
    const bParsed = parseSeat(b);
    const colDiff = columnToIndex(aParsed.col) - columnToIndex(bParsed.col);
    if (colDiff !== 0) return colDiff;
    return aParsed.row - bParsed.row;
  });
  const columns = [...new Set(sortedLabels.map((label) => parseSeat(label).col))].sort(
    (a, b) => columnToIndex(a) - columnToIndex(b)
  );

  const getColor = (branch) => {
    if (!branchMap.has(branch)) {
      branchMap.set(branch, branchColors[colorIndex % branchColors.length]);
      colorIndex += 1;
    }
    return branchMap.get(branch);
  };

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}>
      {sortedLabels.map((label) => {
        const seat = seatMap.get(label);
        const branch = seat?.student_one?.branch || "";
        const hasStudent = Boolean(seat?.student_one);
        return (
          <div
            key={label}
            className={clsx(
              "rounded-xl border px-3 py-3 min-h-[92px] text-xs",
              hasStudent ? getColor(branch) : "border-orange-100 text-orange-300 bg-white/80"
            )}
          >
              <p className="text-[9px] uppercase tracking-[0.35em] text-slate-400">{label}</p>
            {hasStudent ? (
              <div className="mt-2 flex flex-col gap-1">
                <div>
                    <p className="font-semibold text-xs leading-tight text-slate-900">{seat.student_one.name}</p>
                    <p className="text-[10px] text-slate-600">{seat.student_one.roll_no}</p>
                  </div>
                  {examType === "MID" && seat.student_two && (
                    <div>
                    <p className="font-semibold text-xs leading-tight text-slate-900">{seat.student_two.name}</p>
                    <p className="text-[10px] text-slate-600">{seat.student_two.roll_no}</p>
                    </div>
                  )}
              </div>
            ) : (
              <p className="mt-4 text-slate-400">Empty</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

