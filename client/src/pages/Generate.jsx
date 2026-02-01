import { useEffect, useState } from "react";
import { addClassroom, generateSeating, getBranches, getClassrooms, getInvigilators, addInvigilator } from "../api.js";

const examTypes = ["MID", "SEMESTER"];

export default function Generate({ onGenerated }) {
  const [examType, setExamType] = useState("SEMESTER");
  const [groupBranch, setGroupBranch] = useState("");
  const [groupYear, setGroupYear] = useState("2");
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [newRoom, setNewRoom] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [status, setStatus] = useState(null);
  const [invigilators, setInvigilators] = useState([]);
  const [invigilatorMap, setInvigilatorMap] = useState({});
  const [newInvigilator, setNewInvigilator] = useState({ name: "", department: "", designation: "" });
  const [groupStats, setGroupStats] = useState([]);
  const [generatedBatch, setGeneratedBatch] = useState("");

  useEffect(() => {
    getBranches("").then(setBranches).catch(() => setBranches([]));
    getClassrooms().then(setRooms).catch(() => setRooms([]));
    getInvigilators().then(setInvigilators).catch(() => setInvigilators([]));
  }, []);

  const toggle = (item, list, setter) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const onAddRoom = async () => {
    if (!newRoom) return;
    await addClassroom({ room_no: newRoom, capacity: Number(capacity || 30) });
    const updated = await getClassrooms();
    setRooms(updated);
    setNewRoom("");
  };

  useEffect(() => {
    const nextMap = {};
    selectedRooms.forEach((room) => {
      nextMap[room] = invigilatorMap[room] || [];
    });
    setInvigilatorMap(nextMap);
  }, [selectedRooms]);

  const toggleInvigilator = (roomNo, invigilatorId) => {
    const current = invigilatorMap[roomNo] || [];
    const next = current.includes(invigilatorId)
      ? current.filter((id) => id !== invigilatorId)
      : [...current, invigilatorId];
    setInvigilatorMap({ ...invigilatorMap, [roomNo]: next });
  };

  const onAddInvigilator = async () => {
    if (!newInvigilator.name || !newInvigilator.department) return;
    await addInvigilator(newInvigilator);
    const updated = await getInvigilators();
    setInvigilators(updated);
    setNewInvigilator({ name: "", department: "", designation: "" });
  };

  const submit = async () => {
    setStatus(null);
    try {
      const result = await generateSeating({
        examType,
        groups,
        rooms: selectedRooms,
        invigilatorMap
      });
      setGroupStats(result.groupStats || []);
      setGeneratedBatch(result.batchId || "");
      setStatus({
        type: "success",
        message: `Generated batch ${result.batchId}. Assigned: ${result.assignedStudents}, Unassigned: ${result.unassignedStudents}, Empty Seats: ${result.emptySeats}`
      });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const canGenerate = groups.length > 0 && selectedRooms.length > 0;

  const addGroup = () => {
    if (!groupBranch || !groupYear) return;
    const exists = groups.some((g) => g.branch === groupBranch && g.year === groupYear);
    if (exists) return;
    setGroups([...groups, { branch: groupBranch, year: groupYear }]);
  };

  const removeGroup = (branch, year) => {
    setGroups(groups.filter((g) => !(g.branch === branch && g.year === year)));
  };

  return (
    <section className="glass rounded-3xl p-8 md:p-10 card-ring">
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-2xl font-display font-semibold text-slate-900">Generate Seating</h2>
          <p className="text-slate-600 mt-2">Choose exam type, year, participating branches, and rooms.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
            <label className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Step 1 • Exam Type</label>
            <div className="mt-3 flex flex-wrap gap-2">
              {examTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setExamType(type)}
                  className={`px-4 py-2 rounded-full text-sm border ${
                    examType === type
                      ? "bg-orange-600 text-white border-orange-600"
                      : "border-orange-200 text-orange-700"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
          <label className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
            Step 2 • Add Branch + Year
            </label>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <select
                value={groupBranch}
                onChange={(e) => setGroupBranch(e.target.value)}
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-sm"
              >
                <option value="">Branch</option>
                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
              <select
                value={groupYear}
                onChange={(e) => setGroupYear(e.target.value)}
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-sm"
              >
                {["1", "2", "3", "4"].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
              <button
                onClick={addGroup}
                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Add Group
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {groups.length === 0 && <span className="text-xs text-slate-500">No groups added yet.</span>}
              {groups.map((group) => (
                <button
                  key={`${group.branch}-${group.year}`}
                  onClick={() => removeGroup(group.branch, group.year)}
                  className="rounded-full border border-orange-200 px-3 py-1 text-xs text-orange-700"
                >
                  {group.branch} – Year {group.year} ✕
                </button>
              ))}
            </div>
            {groupStats.length > 0 && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {groupStats.map((stat) => (
                  <div
                    key={`${stat.branch}-${stat.year}`}
                    className="rounded-xl border border-orange-100 bg-white/80 p-3 text-sm"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      {stat.branch} • Year {stat.year}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                      <span>Total: {stat.total}</span>
                      <span>Assigned: {stat.assigned}</span>
                      <span>Unassigned: {stat.unassigned}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
            <label className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Step 3 • Rooms</label>
            <div className="mt-3 flex gap-2">
              <input
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                placeholder="Add room no"
                className="flex-1 rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-sm"
              />
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-20 rounded-xl border border-orange-200 bg-white/90 px-3 py-2 text-sm"
              />
              <button
                onClick={onAddRoom}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-orange-100 bg-white/80 p-4 lg:col-span-2">
            <h3 className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Step 3 • Classrooms</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {rooms.length === 0 && <p className="text-slate-500 text-sm">No rooms available.</p>}
              {rooms.map((room) => (
                <button
                  key={room.room_no}
                  onClick={() => toggle(room.room_no, selectedRooms, setSelectedRooms)}
                  className={`px-4 py-2 rounded-full text-sm border ${
                    selectedRooms.includes(room.room_no)
                      ? "bg-orange-100 border-orange-300 text-orange-800"
                      : "border-orange-200 text-orange-700"
                  }`}
                >
                  {room.room_no}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Step 4 • Invigilators</h3>
              <p className="text-sm text-slate-600 mt-2">Assign invigilators per selected room.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={newInvigilator.name}
                onChange={(e) => setNewInvigilator({ ...newInvigilator, name: e.target.value })}
                placeholder="Name"
                className="rounded-xl border border-orange-200 bg-white/90 px-3 py-2 text-sm"
              />
              <input
                value={newInvigilator.department}
                onChange={(e) => setNewInvigilator({ ...newInvigilator, department: e.target.value })}
                placeholder="Department"
                className="rounded-xl border border-orange-200 bg-white/90 px-3 py-2 text-sm"
              />
              <input
                value={newInvigilator.designation}
                onChange={(e) => setNewInvigilator({ ...newInvigilator, designation: e.target.value })}
                placeholder="Designation"
                className="rounded-xl border border-orange-200 bg-white/90 px-3 py-2 text-sm"
              />
              <button
                onClick={onAddInvigilator}
                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Add Invigilator
              </button>
            </div>
          </div>
          {selectedRooms.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Select rooms to assign invigilators.</p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {selectedRooms.map((roomNo) => (
                <div key={roomNo} className="rounded-xl border border-orange-100 bg-white/60 p-3">
                  <p className="text-sm font-semibold text-slate-900">Room {roomNo}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {invigilators.length === 0 && (
                      <span className="text-xs text-slate-500">No invigilators available.</span>
                    )}
                    {invigilators.map((inv) => {
                      const active = invigilatorMap[roomNo]?.includes(inv.id);
                      return (
                        <button
                          key={inv.id}
                          onClick={() => toggleInvigilator(roomNo, inv.id)}
                          className={`px-3 py-1 rounded-full text-xs border ${
                            active
                              ? "bg-orange-100 border-orange-300 text-orange-800"
                              : "border-orange-200 text-orange-700"
                          }`}
                        >
                          {inv.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={submit}
          disabled={!canGenerate}
          className="rounded-2xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 disabled:opacity-50"
        >
          Generate Seating
        </button>

        {status && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              status.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
            }`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <span>{status.message}</span>
              {generatedBatch && (
                <button
                  type="button"
                  onClick={() => onGenerated?.(generatedBatch)}
                  className="rounded-full bg-orange-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  View Preview
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
