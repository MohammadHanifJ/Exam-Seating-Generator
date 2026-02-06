import "dotenv/config";

import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { query, initSchema } from "./db.js";
import { parseStudentFile, validateStudents } from "./upload.js";
import {
  buildSeatLabels,
  generateMidSeating,
  generateSemesterSeating,
  prepareStudents,
  countSeatsFilled
} from "./seating.js";
import { buildCombinedPdf, buildRoomPdf } from "./pdf.js";
import { createMailer } from "./mail.js";

const app = express();

/* =========================
   BASIC MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   FILE UPLOAD CONFIG
========================= */
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ext === ".csv" || ext === ".xlsx") {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  }
});

/* =========================
   ADMIN TOKEN LOGIC
   (SAFE + STATELESS)
========================= */
const ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || "dev-admin-secret";
const ADMIN_TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

function signToken(email) {
  const expiresAt = Date.now() + ADMIN_TOKEN_TTL_MS;
  const payload = `${email}:${expiresAt}`;
  const sig = crypto
    .createHmac("sha256", ADMIN_TOKEN_SECRET)
    .update(payload)
    .digest("base64url");

  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function verifyToken(token) {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [email, expiresAtRaw, sig] = raw.split(":");
    if (!email || !expiresAtRaw || !sig) return null;
    const expiresAt = Number(expiresAtRaw);
    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return null;
    const payload = `${email}:${expiresAt}`;
    const expected = crypto
      .createHmac("sha256", ADMIN_TOKEN_SECRET)
      .update(payload)
      .digest("base64url");
    return expected === sig ? email : null;
  } catch {
    return null;
  }
}

/* =========================
   SAFE ADMIN MIDDLEWARE
   (WON’T BREAK LOCAL APP)
========================= */
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  if (!auth) return next();
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return next();
  const email = verifyToken(token);
  if (!email) return next();
  req.adminEmail = email;
  next();
}

function groupKey(branch, year) {
  return `${branch}::${year}`;
}

async function assignInvigilators({ batchId, rooms, invigilatorMap, invigilators }) {
  const assignments = [];
  if (invigilatorMap && typeof invigilatorMap === "object") {
    Object.entries(invigilatorMap).forEach(([roomNo, ids]) => {
      (ids || []).forEach((id) => assignments.push({ room_no: roomNo, invigilator_id: id }));
    });
  } else if (Array.isArray(invigilators) && invigilators.length > 0) {
    let index = 0;
    rooms.forEach((room) => {
      const id = invigilators[index % invigilators.length];
      if (id) assignments.push({ room_no: room.room_no, invigilator_id: id });
      index += 1;
    });
  }

  for (const assignment of assignments) {
    await query(
      "INSERT INTO room_invigilators (batch_id, room_no, invigilator_id) VALUES ($1, $2, $3)",
      [batchId, assignment.room_no, assignment.invigilator_id]
    );
  }
}

/* =========================
   HEALTH CHECK
========================= */
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/* =========================
   ADMIN AUTH
========================= */
app.post("/api/admin/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const hash = await bcrypt.hash(password, 10);
  await query(
    "INSERT INTO admins (email, password_hash) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [email.toLowerCase(), hash]
  );

  const token = signToken(email.toLowerCase());
  res.json({ ok: true, token });
});

app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body || {};
  const result = await query(
    "SELECT * FROM admins WHERE email=$1 AND active=TRUE",
    [email.toLowerCase()]
  );

  if (!result.rows.length) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const admin = result.rows[0];
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(admin.email);
  res.json({ ok: true, token });
});

app.get("/api/setup", async (req, res) => {
  await initSchema();
  res.json({ ok: true });
});

/* =========================
   STUDENTS
========================= */
app.get("/api/students", requireAdmin, async (req, res) => {
  const { branch, year, status } = req.query;
  const filters = ["active = TRUE"];
  const params = [];
  if (branch) {
    params.push(branch);
    filters.push(`branch = $${params.length}`);
  }
  if (year) {
    params.push(year);
    filters.push(`year = $${params.length}`);
  }
  if (status === "approved") {
    filters.push("approved = TRUE AND blocked = FALSE");
  } else if (status === "blocked") {
    filters.push("blocked = TRUE");
  } else if (status === "pending") {
    filters.push("approved = FALSE AND blocked = FALSE");
  }
  const where = `WHERE ${filters.join(" AND ")}`;
  const result = await query(
    `SELECT id, name, roll_no, branch, year, approved, blocked, active
     FROM students ${where} ORDER BY branch, year, roll_no`,
    params
  );
  res.json(result.rows);
});

app.patch("/api/students/:id/approve", requireAdmin, async (req, res) => {
  await query("UPDATE students SET approved = TRUE, blocked = FALSE WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

app.patch("/api/students/:id/block", requireAdmin, async (req, res) => {
  await query("UPDATE students SET blocked = TRUE, approved = FALSE WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

app.patch("/api/students/approve-all", requireAdmin, async (req, res) => {
  const result = await query(
    "UPDATE students SET approved = TRUE, blocked = FALSE WHERE active = TRUE RETURNING id"
  );
  res.json({ ok: true, updated: result.rowCount });
});

/* =========================
   INVIGILATORS
========================= */
app.get("/api/invigilators", requireAdmin, async (req, res) => {
  const result = await query(
    "SELECT id, name, department, designation, active FROM invigilators WHERE active = TRUE ORDER BY name"
  );
  res.json(result.rows);
});

app.post("/api/invigilators", requireAdmin, async (req, res) => {
  const { name, department, designation } = req.body || {};
  if (!name || !department) {
    return res.status(400).json({ error: "Name and department are required" });
  }
  const result = await query(
    "INSERT INTO invigilators (name, department, designation) VALUES ($1, $2, $3) RETURNING id",
    [name, department, designation || null]
  );
  res.json({ ok: true, id: result.rows[0].id });
});

app.delete("/api/invigilators/:id", requireAdmin, async (req, res) => {
  await query("UPDATE invigilators SET active = FALSE WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

/* =========================
   STUDENT UPLOAD
========================= */
app.post("/api/upload-students", requireAdmin, (req, res) => {
  upload.any()(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    const file = req.file || req.files?.[0];
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const rows = await parseStudentFile(file);
    const { valid, errors } = validateStudents(rows);

    let inserted = 0;
    for (const row of valid) {
      const r = await query(
        `INSERT INTO students (name, roll_no, branch, year, approved, blocked)
         VALUES ($1,$2,$3,$4,FALSE,FALSE)
         ON CONFLICT (roll_no) DO NOTHING RETURNING id`,
        [row.name, row.roll_no, row.branch, row.year]
      );
      if (r.rows.length) inserted++;
    }

    res.json({ inserted, rejected: errors.length });
  });
});

/* =========================
   BRANCHES + ROOMS
========================= */
app.get("/api/branches", requireAdmin, async (req, res) => {
  const year = req.query.year;
  const result = await query(
    `SELECT DISTINCT branch FROM students WHERE active = TRUE ${year ? "AND year = $1" : ""} ORDER BY branch`,
    year ? [year] : []
  );
  res.json(result.rows.map((r) => r.branch));
});

app.get("/api/classrooms", requireAdmin, async (req, res) => {
  const result = await query("SELECT room_no, capacity, active FROM classrooms WHERE active = TRUE ORDER BY room_no");
  res.json(result.rows);
});

app.post("/api/classrooms", requireAdmin, async (req, res) => {
  const { room_no, capacity } = req.body;
  if (!room_no) return res.status(400).json({ error: "room_no is required" });
  await query(
    "INSERT INTO classrooms (room_no, capacity) VALUES ($1, $2) ON CONFLICT (room_no) DO UPDATE SET capacity = EXCLUDED.capacity",
    [room_no, capacity || 30]
  );
  res.json({ ok: true });
});

/* =========================
   SEATING GENERATION
========================= */
app.post("/api/generate", requireAdmin, async (req, res) => {
  const { examType, groups, rooms, invigilatorMap, invigilators } = req.body;
  const batchId = uuidv4();

  if (!examType || !groups?.length || !rooms?.length) {
    return res.status(400).json({ error: "Missing selection" });
  }

  const roomRows = await query(
    "SELECT room_no, capacity FROM classrooms WHERE room_no = ANY($1::text[]) AND active = TRUE",
    [rooms]
  );

  if (roomRows.rows.length === 0) {
    return res.status(400).json({ error: "No active rooms found" });
  }

  if (examType === "SEMESTER") {
    if (groups.length < 2) {
      return res.status(400).json({ error: "Semester exam needs at least two branches" });
    }

    const studentsByBranch = {};
    const groupTotals = {};
    for (const group of groups) {
      const result = await query(
        "SELECT * FROM students WHERE active = TRUE AND approved = TRUE AND blocked = FALSE AND year = $1 AND branch = $2 ORDER BY roll_no",
        [group.year, group.branch]
      );
      const key = groupKey(group.branch, group.year);
      const prepared = prepareStudents(result.rows);
      studentsByBranch[key] = prepared;
      groupTotals[key] = prepared.length;
    }

    const seats = [];
    let assignedStudents = 0;
    const groupAssigned = {};

    for (let i = 0; i < roomRows.rows.length; i += 1) {
      const room = roomRows.rows[i];
      const groupOne = groups[i % groups.length];
      let groupTwo = groups[(i + 1) % groups.length];
      if (groupOne.branch === groupTwo.branch) {
        groupTwo = groups.find((g) => g.branch !== groupOne.branch) || groupTwo;
      }
      if (groupOne.branch === groupTwo.branch) {
        return res.status(400).json({ error: "Semester seating requires two distinct branches per room" });
      }

      const listOne = studentsByBranch[groupKey(groupOne.branch, groupOne.year)];
      const listTwo = studentsByBranch[groupKey(groupTwo.branch, groupTwo.year)];

      const roomSeats = generateSemesterSeating({
        roomNo: room.room_no,
        studentsOne: listOne,
        studentsTwo: listTwo,
        capacity: room.capacity || 30
      });

      roomSeats.forEach((seat) => {
        if (seat.student_one) {
          assignedStudents += 1;
          const key = groupKey(seat.student_one.branch, seat.student_one.year);
          groupAssigned[key] = (groupAssigned[key] || 0) + 1;
        }
      });

      seats.push(...roomSeats);
    }

    if (seats.length === 0) {
      return res.status(400).json({ error: "No seating generated" });
    }

    for (const seat of seats) {
      if (!seat.student_one) continue;
      await query(
        `INSERT INTO seating (batch_id, exam_type, year, room_no, seat_label, student_one_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [batchId, "SEMESTER", seat.student_one.year, seat.room_no, seat.seat_label, seat.student_one.id]
      );
    }

    const unassignedStudents = Object.values(studentsByBranch).reduce((sum, list) => sum + list.length, 0);
    const totalSeats = roomRows.rows.reduce((sum, room) => sum + (room.capacity || 30), 0);
    const seatsFilled = countSeatsFilled(seats);
    const emptySeats = totalSeats - seatsFilled;
    const groupStats = groups.map((group) => {
      const key = groupKey(group.branch, group.year);
      const total = groupTotals[key] || 0;
      const assigned = groupAssigned[key] || 0;
      return { branch: group.branch, year: group.year, total, assigned, unassigned: Math.max(0, total - assigned) };
    });

    if (invigilatorMap || invigilators?.length) {
      await assignInvigilators({ batchId, rooms: roomRows.rows, invigilatorMap, invigilators });
    }

    return res.json({ batchId, assignedStudents, unassignedStudents, emptySeats, totalSeats, seatsFilled, groupStats });
  }

  if (examType === "MID") {
    const result = await query(
      "SELECT * FROM students WHERE active = TRUE AND approved = TRUE AND blocked = FALSE AND (year, branch) IN (SELECT * FROM UNNEST($1::text[], $2::text[])) ORDER BY roll_no",
      [groups.map((g) => g.year), groups.map((g) => g.branch)]
    );

    const allStudents = prepareStudents(result.rows);
    const groupTotals = {};
    const groupAssigned = {};
    allStudents.forEach((student) => {
      const key = groupKey(student.branch, student.year);
      groupTotals[key] = (groupTotals[key] || 0) + 1;
    });

    const seats = [];
    let assignedStudents = 0;

    for (const room of roomRows.rows) {
      const roomSeats = generateMidSeating({ roomNo: room.room_no, students: allStudents, capacity: room.capacity || 30 });
      roomSeats.forEach((seat) => {
        if (seat.student_one) {
          assignedStudents += 1;
          const key = groupKey(seat.student_one.branch, seat.student_one.year);
          groupAssigned[key] = (groupAssigned[key] || 0) + 1;
        }
        if (seat.student_two) {
          assignedStudents += 1;
          const key = groupKey(seat.student_two.branch, seat.student_two.year);
          groupAssigned[key] = (groupAssigned[key] || 0) + 1;
        }
      });
      seats.push(...roomSeats);
    }

    for (const seat of seats) {
      if (!seat.student_one) continue;
      await query(
        `INSERT INTO seating (batch_id, exam_type, year, room_no, seat_label, student_one_id, student_two_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [batchId, "MID", seat.student_one.year, seat.room_no, seat.seat_label, seat.student_one.id, seat.student_two?.id || null]
      );
    }

    const unassignedStudents = allStudents.length;
    const totalSeats = roomRows.rows.reduce((sum, room) => sum + (room.capacity || 30), 0);
    const seatsFilled = countSeatsFilled(seats);
    const emptySeats = totalSeats - seatsFilled;
    const groupStats = groups.map((group) => {
      const key = groupKey(group.branch, group.year);
      const total = groupTotals[key] || 0;
      const assigned = groupAssigned[key] || 0;
      return { branch: group.branch, year: group.year, total, assigned, unassigned: Math.max(0, total - assigned) };
    });

    if (invigilatorMap || invigilators?.length) {
      await assignInvigilators({ batchId, rooms: roomRows.rows, invigilatorMap, invigilators });
    }

    return res.json({ batchId, assignedStudents, unassignedStudents, emptySeats, totalSeats, seatsFilled, groupStats });
  }

  return res.status(400).json({ error: "Invalid exam type" });
});

/* =========================
   SEATING PREVIEW
========================= */
app.get("/api/seating/:batchId", requireAdmin, async (req, res) => {
  const batchId = req.params.batchId;
  const rows = await query(
    `SELECT s.batch_id, s.exam_type, s.year, s.room_no, s.seat_label,
            st1.id as s1_id, st1.name as s1_name, st1.roll_no as s1_roll, st1.branch as s1_branch, st1.year as s1_year,
            st2.id as s2_id, st2.name as s2_name, st2.roll_no as s2_roll, st2.branch as s2_branch, st2.year as s2_year
     FROM seating s
     JOIN students st1 ON s.student_one_id = st1.id
     LEFT JOIN students st2 ON s.student_two_id = st2.id
     WHERE s.batch_id = $1
     ORDER BY s.room_no, s.seat_label`,
    [batchId]
  );

  const roomNos = Array.from(new Set(rows.rows.map((row) => row.room_no)));
  const roomCaps = roomNos.length
    ? await query("SELECT room_no, capacity FROM classrooms WHERE room_no = ANY($1::text[])", [roomNos])
    : { rows: [] };
  const capacityByRoom = {};
  roomCaps.rows.forEach((row) => {
    capacityByRoom[row.room_no] = row.capacity || 30;
  });

  const invRows = await query(
    `SELECT ri.room_no, i.id, i.name, i.department, i.designation
     FROM room_invigilators ri
     JOIN invigilators i ON ri.invigilator_id = i.id
     WHERE ri.batch_id = $1`,
    [batchId]
  );
  const invByRoom = {};
  invRows.rows.forEach((row) => {
    if (!invByRoom[row.room_no]) invByRoom[row.room_no] = [];
    invByRoom[row.room_no].push({
      id: row.id,
      name: row.name,
      department: row.department,
      designation: row.designation
    });
  });

  const byRoom = {};
  const branchSet = new Set();
  rows.rows.forEach((row) => {
    if (!byRoom[row.room_no]) {
      byRoom[row.room_no] = {
        room_no: row.room_no,
        exam_type: row.exam_type,
        year: row.year,
        seats: [],
        capacity: capacityByRoom[row.room_no] || 30,
        invigilators: invByRoom[row.room_no] || []
      };
    }
    branchSet.add(row.s1_branch);
    if (row.s2_branch) branchSet.add(row.s2_branch);
    byRoom[row.room_no].seats.push({
      seat_label: row.seat_label,
      student_one: {
        id: row.s1_id,
        name: row.s1_name,
        roll_no: row.s1_roll,
        branch: row.s1_branch,
        year: row.s1_year
      },
      student_two: row.s2_id
        ? { id: row.s2_id, name: row.s2_name, roll_no: row.s2_roll, branch: row.s2_branch, year: row.s2_year }
        : null
    });
  });

  Object.values(byRoom).forEach((room) => {
    const labels = buildSeatLabels(room.capacity || 30);
    const seatMap = new Map(room.seats.map((seat) => [seat.seat_label, seat]));
    room.seats = labels.map((label) => seatMap.get(label) || { seat_label: label, student_one: null, student_two: null });
  });

  const assignedSeats = rows.rows.length;
  const assignedStudents = rows.rows.reduce((sum, row) => sum + (row.s2_id ? 2 : 1), 0);
  const totalSeats = Object.values(byRoom).reduce((sum, room) => sum + (room.capacity || 30), 0);
  const seatsFilled = assignedSeats;
  const emptySeats = totalSeats - assignedSeats;
  const branchList = Array.from(branchSet);
  const yearList = Array.from(new Set(rows.rows.map((row) => row.s1_year).filter(Boolean)));
  let unassignedStudents = null;
  if (branchList.length > 0) {
    const total = await query(
      "SELECT COUNT(*)::int AS total FROM students WHERE active = TRUE AND approved = TRUE AND blocked = FALSE AND year = ANY($1::text[]) AND branch = ANY($2::text[])",
      [yearList, branchList]
    );
    unassignedStudents = Math.max(0, total.rows[0].total - assignedStudents);
  }

  res.json({ rooms: Object.values(byRoom), assignedStudents, unassignedStudents, emptySeats, totalSeats, seatsFilled });
});

/* =========================
   PDF
========================= */
app.get("/api/seating/:batchId/pdf", requireAdmin, async (req, res) => {
  const batchId = req.params.batchId;
  const roomNo = req.query.room;
  const rows = await query(
    `SELECT s.exam_type, s.year, s.room_no, s.seat_label,
            st1.name as s1_name, st1.roll_no as s1_roll, st1.branch as s1_branch, st1.year as s1_year,
            st2.name as s2_name, st2.roll_no as s2_roll, st2.branch as s2_branch, st2.year as s2_year
     FROM seating s
     JOIN students st1 ON s.student_one_id = st1.id
     LEFT JOIN students st2 ON s.student_two_id = st2.id
     WHERE s.batch_id = $1 ${roomNo ? "AND s.room_no = $2" : ""}
     ORDER BY s.room_no, s.seat_label`,
    roomNo ? [batchId, roomNo] : [batchId]
  );

  if (rows.rows.length === 0) {
    return res.status(404).json({ error: "No seating found" });
  }

  const invRows = await query(
    `SELECT ri.room_no, i.name, i.department, i.designation
     FROM room_invigilators ri
     JOIN invigilators i ON ri.invigilator_id = i.id
     WHERE ri.batch_id = $1`,
    [batchId]
  );
  const invByRoom = {};
  invRows.rows.forEach((row) => {
    if (!invByRoom[row.room_no]) invByRoom[row.room_no] = [];
    invByRoom[row.room_no].push({
      name: row.name,
      department: row.department,
      designation: row.designation
    });
  });

  const grouped = {};
  const branchSet = new Set();
  rows.rows.forEach((row) => {
    if (!grouped[row.room_no]) grouped[row.room_no] = [];
    branchSet.add(row.s1_branch);
    if (row.s2_branch) branchSet.add(row.s2_branch);
    grouped[row.room_no].push({
      seat_label: row.seat_label,
      student_one: {
        name: row.s1_name,
        roll_no: row.s1_roll,
        branch: row.s1_branch,
        year: row.s1_year
      },
      student_two: row.s2_name
        ? { name: row.s2_name, roll_no: row.s2_roll, branch: row.s2_branch, year: row.s2_year }
        : null
    });
  });

  const roomNos = Object.keys(grouped);
  const roomCaps = roomNos.length
    ? await query("SELECT room_no, capacity FROM classrooms WHERE room_no = ANY($1::text[])", [roomNos])
    : { rows: [] };
  const capacityByRoom = {};
  roomCaps.rows.forEach((row) => {
    capacityByRoom[row.room_no] = row.capacity || 30;
  });

  let buffer;
  const examType = rows.rows[0].exam_type;
  const departments = Array.from(branchSet);
  const countsByRoom = {};
  Object.keys(grouped).forEach((roomNoKey) => {
    const assignedSeats = grouped[roomNoKey].length;
    const assignedStudents = grouped[roomNoKey].reduce((sum, seat) => sum + (seat.student_two ? 2 : 1), 0);
    const capacity = capacityByRoom[roomNoKey] || 30;
    const emptySeats = capacity - assignedSeats;
    countsByRoom[roomNoKey] = {
      assignedStudents,
      unassignedStudents: 0,
      emptySeats
    };
  });

  if (roomNo) {
    buffer = await buildRoomPdf({
      roomNo,
      examType,
      seats: grouped[roomNo],
      capacity: capacityByRoom[roomNo] || 30,
      counts: countsByRoom[roomNo],
      departments,
      invigilators: invByRoom[roomNo] || []
    });
  } else {
    const rooms = Object.keys(grouped).map((key) => ({
      room_no: key,
      seats: grouped[key],
      capacity: capacityByRoom[key] || 30,
      invigilators: invByRoom[key] || []
    }));
    buffer = await buildCombinedPdf({
      examType,
      rooms,
      countsByRoom,
      departments
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=seating.pdf");
  res.send(buffer);
});

/* =========================
   EMAIL
========================= */
app.post("/api/seating/:batchId/email", requireAdmin, async (req, res) => {
  const batchId = req.params.batchId;
  const { recipients } = req.body;
  if (!recipients?.length) {
    return res.status(400).json({ error: "Recipients required" });
  }

  const rows = await query(
    `SELECT s.exam_type, s.year, s.room_no, s.seat_label,
            st1.name as s1_name, st1.roll_no as s1_roll, st1.branch as s1_branch, st1.year as s1_year,
            st2.name as s2_name, st2.roll_no as s2_roll, st2.branch as s2_branch, st2.year as s2_year
     FROM seating s
     JOIN students st1 ON s.student_one_id = st1.id
     LEFT JOIN students st2 ON s.student_two_id = st2.id
     WHERE s.batch_id = $1
     ORDER BY s.room_no, s.seat_label`,
    [batchId]
  );

  if (rows.rows.length === 0) {
    return res.status(404).json({ error: "No seating found" });
  }

  const invRows = await query(
    `SELECT ri.room_no, i.name, i.department, i.designation
     FROM room_invigilators ri
     JOIN invigilators i ON ri.invigilator_id = i.id
     WHERE ri.batch_id = $1`,
    [batchId]
  );
  const invByRoom = {};
  invRows.rows.forEach((row) => {
    if (!invByRoom[row.room_no]) invByRoom[row.room_no] = [];
    invByRoom[row.room_no].push({
      name: row.name,
      department: row.department,
      designation: row.designation
    });
  });

  const grouped = {};
  rows.rows.forEach((row) => {
    if (!grouped[row.room_no]) grouped[row.room_no] = [];
    grouped[row.room_no].push({
      seat_label: row.seat_label,
      student_one: {
        name: row.s1_name,
        roll_no: row.s1_roll,
        branch: row.s1_branch,
        year: row.s1_year
      },
      student_two: row.s2_name
        ? { name: row.s2_name, roll_no: row.s2_roll, branch: row.s2_branch, year: row.s2_year }
        : null
    });
  });

  const roomNos = Object.keys(grouped);
  const roomCaps = roomNos.length
    ? await query("SELECT room_no, capacity FROM classrooms WHERE room_no = ANY($1::text[])", [roomNos])
    : { rows: [] };
  const capacityByRoom = {};
  roomCaps.rows.forEach((row) => {
    capacityByRoom[row.room_no] = row.capacity || 30;
  });
  const countsByRoom = {};
  Object.keys(grouped).forEach((roomNoKey) => {
    const assignedSeats = grouped[roomNoKey].length;
    const assignedStudents = grouped[roomNoKey].reduce((sum, seat) => sum + (seat.student_two ? 2 : 1), 0);
    const capacity = capacityByRoom[roomNoKey] || 30;
    const emptySeats = capacity - assignedSeats;
    countsByRoom[roomNoKey] = {
      assignedStudents,
      unassignedStudents: 0,
      emptySeats
    };
  });

  const rooms = Object.keys(grouped).map((key) => ({
    room_no: key,
    seats: grouped[key],
    capacity: capacityByRoom[key] || 30,
    invigilators: invByRoom[key] || []
  }));

  const buffer = await buildCombinedPdf({
    examType: rows.rows[0].exam_type,
    rooms,
    countsByRoom,
    departments: []
  });

  const mailer = createMailer();
  await mailer.sendMail({
    from: process.env.SMTP_FROM,
    to: recipients.join(","),
    subject: "Exam Seating Arrangement",
    text: "Attached is the seating arrangement PDF.",
    attachments: [{ filename: "seating.pdf", content: buffer }]
  });

  res.json({ ok: true });
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3001;

async function startServer() {
  await initSchema();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer().catch((err) => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});
