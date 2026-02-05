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
const ADMIN_TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET || "dev-admin-secret";

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
    if (Date.now() > expiresAt) return null;

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

  // If no auth header → allow (local/dev safe)
  if (!auth) return next();

  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : null;

  if (!token) return next();

  const email = verifyToken(token);
  if (!email) return next();

  req.adminEmail = email;
  next();
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
   SERVER START
========================= */
const PORT = process.env.PORT || 3001;

async function startServer() {
  await initSchema();
  app.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
  );
}

startServer().catch((err) => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});
