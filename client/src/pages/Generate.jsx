import { useEffect, useState } from "react";
import {
  addClassroom,
  deleteClassroom,
  generateSeating,
  getBranches,
  getClassrooms,
  getInvigilators,
  addInvigilator,
  deleteInvigilator
} from "../api.js";

const examTypes = ["MID", "SEMESTER"];
const floors = ["Ground Floor", "First Floor", "Second Floor", "Third Floor"];

export default function Generate({ onGenerated }) {
  const [examType, setExamType] = useState("SEMESTER");
  const [groupBranch, setGroupBranch] = useState("");
  const [groupYear, setGroupYear] = useState("2");
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [newRoom, setNewRoom] = useState("");
  const [blockName, setBlockName] = useState("");
  const [floorName, setFloorName] = useState("Ground Floor");
  const [capacity, setCapacity] = useState(30);
  const [status, setStatus] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
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
    if (!newRoom || !blockName) return;
    setStatus(null);
    setIsAddingRoom(true);
    try {
      await addClassroom({
        room_no: newRoom,
        block_name: blockName,
        floor_name: floorName,
        capacity: Number(capacity || 30)
      });
      const updated = await getClassrooms();
      setRooms(updated);
      setNewRoom("");
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setIsAddingRoom(false);
    }
  };

  const onDeleteRoom = async (roomNo) => {
    const ok = window.confirm("Are you sure you want to delete this classroom?");
    if (!ok) return;
    setStatus(null);
    try {
      await deleteClassroom(roomNo);
      setRooms((prev) => prev.filter((room) => room.room_no !== roomNo));
      setSelectedRooms((prev) => prev.filter((room) => room !== roomNo));
      const updated = await getClassrooms();
      setRooms(updated);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
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

  const onDeleteInvigilator = async (id) => {
    const ok = window.confirm("Delete this invigilator?");
    if (!ok) return;
    await deleteInvigilator(id);
    const updated = await getInvigilators();
    setInvigilators(updated);
    const nextMap = { ...invigilatorMap };
    Object.keys(nextMap).forEach((roomNo) => {
      nextMap[roomNo] = (nextMap[roomNo] || []).filter((invId) => invId !== id);
    });
    setInvigilatorMap(nextMap);
  };

  const submit = async () => {
    setStatus(null);
    setIsGenerating(true);
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
      onGenerated?.(result.batchId);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = groups.length > 0 && selectedRooms.length > 0 && !isGenerating;

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
          <h2 className="text-lg font-display font-semibold text-slate-900">Generate Seating</h2>
          <p className="text-slate-600 text-sm">Complete the steps in order to generate seating.</p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
          <label className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Step 1 • Select Exam Details</label>
          <div className="mt-3 flex flex-wrap gap-2">
            {examTypes.map((type) => (
              <button
                key={type}
                onClick={() => setExamType(type)}
                className={`min-w-[160px] px-8 py-3 rounded-full text-sm border ${
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
          <label className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Step 2 • Select Branches / Groups</label>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <select
              value={groupBranch}
              onChange={(e) => setGroupBranch(e.target.value)}
              className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
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
              className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
            >
              {["1", "2", "3", "4"].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
            <button
              onClick={addGroup}
              className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Add Group
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {groups.length === 0 && <span className="text-[11px] text-slate-500">No groups added yet.</span>}
            {groups.map((group) => (
              <button
                key={`${group.branch}-${group.year}`}
                onClick={() => removeGroup(group.branch, group.year)}
                className="rounded-full border border-orange-200 px-3 py-1 text-[11px] text-orange-700"
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
                  className="rounded-xl border border-orange-100 bg-white/80 p-3 text-xs"
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
          <label className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Step 3 • Add Rooms (Block, Floor, Room No, Capacity)</label>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-slate-700">Block Name</label>
              <input
                value={blockName}
                onChange={(e) => setBlockName(e.target.value)}
                placeholder="e.g. Engineering Block"
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-slate-700">Floor</label>
              <select
                value={floorName}
                onChange={(e) => setFloorName(e.target.value)}
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
              >
                {floors.map((floor) => (
                  <option key={floor} value={floor}>
                    {floor}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-slate-700">Room Number</label>
              <input
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                placeholder="e.g. A-101"
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-slate-700">Room Capacity</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2 text-xs"
              />
            </div>
          </div>
          <button
            onClick={onAddRoom}
            disabled={isAddingRoom}
            className="mt-3 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {isAddingRoom ? "Adding..." : "Add Room"}
          </button>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
          <h3 className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Step 4 • Select Classrooms (Action Only)</h3>
          <div className="mt-4 rounded-2xl border border-orange-100 bg-white/70">
            {rooms.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-500">No rooms available.</p>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                      <th className="py-3 px-4">Block Name</th>
                      <th className="py-3 px-4">Floor Name</th>
                      <th className="py-3 px-4">Room Number</th>
                      <th className="py-3 px-4">Capacity</th>
                      <th className="py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) => {
                      const selected = selectedRooms.includes(room.room_no);
                      return (
                        <tr key={room.room_no} className="border-t border-orange-100 text-slate-700">
                          <td className="py-3 px-4">{room.block_name ?? "Unknown Block"}</td>
                          <td className="py-3 px-4">{room.floor_name ?? "Ground Floor"}</td>
                          <td className="py-3 px-4">{room.room_no}</td>
                          <td className="py-3 px-4">{room.capacity}</td>
                          <td className="py-3 px-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => toggle(room.room_no, selectedRooms, setSelectedRooms)}
                              className={`rounded-full px-4 py-2 text-[11px] font-semibold border ${
                                selected
                                  ? "bg-orange-100 border-orange-300 text-orange-800"
                                  : "border-orange-200 text-orange-700"
                              }`}
                            >
                              {selected ? "Selected" : "Select"}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRoom(room.room_no)}
                              className="rounded-full border border-rose-200 px-3 py-1 text-[11px] text-rose-700"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Step 5 • Invigilators</h3>
              <p className="text-xs text-slate-600 mt-2">Assign invigilators per selected room.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={newInvigilator.name}
                onChange={(e) => setNewInvigilator({ ...newInvigilator, name: e.target.value })}
                placeholder="Name"
                className="rounded-xl border border-orange-200 bg-white/90 px-3 py-2 text-xs"
              />
              <input
                value={newInvigilator.department}
                onChange={(e) => setNewInvigilator({ ...newInvigilator, department: e.target.value })}
                placeholder="Department"
                className="rounded-xl border border-orange-200 bg-white/90 px-3 py-2 text-xs"
              />
              <input
                value={newInvigilator.designation}
                onChange={(e) => setNewInvigilator({ ...newInvigilator, designation: e.target.value })}
                placeholder="Designation"
                className="rounded-xl border border-orange-200 bg-white/90 px-3 py-2 text-xs"
              />
              <button
                onClick={onAddInvigilator}
                className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Add Invigilator
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {invigilators.length === 0 && <span className="text-[11px] text-slate-500">No invigilators available.</span>}
            {invigilators.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-[11px] text-slate-700"
              >
                <span>
                  {inv.name} {inv.department ? `(${inv.department})` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteInvigilator(inv.id)}
                  className="rounded-full border border-rose-200 px-2 py-0.5 text-[10px] text-rose-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          {selectedRooms.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">Select rooms to assign invigilators.</p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {selectedRooms.map((roomNo) => (
                <div key={roomNo} className="rounded-xl border border-orange-100 bg-white/60 p-3">
                  <p className="text-xs font-semibold text-slate-900">Room {roomNo}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {invigilators.length === 0 && (
                      <span className="text-[11px] text-slate-500">No invigilators available.</span>
                    )}
                    {invigilators.map((inv) => {
                      const active = invigilatorMap[roomNo]?.includes(inv.id);
                      return (
                        <button
                          key={inv.id}
                          onClick={() => toggleInvigilator(roomNo, inv.id)}
                          className={`px-3 py-1 rounded-full text-[11px] border ${
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
          className="rounded-2xl bg-orange-600 px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-orange-600/20 disabled:opacity-50"
        >
          {isGenerating ? "Generating seating arrangement, please wait..." : "Generate Seating"}
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
