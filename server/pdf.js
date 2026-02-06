import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildSeatLabels } from "./seating.js";

const ROW_HEIGHT = 24;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HEADER_IMAGE_PATH = path.resolve(__dirname, "assets", "pdf_header.png");
const HEADER_IMAGE_HEIGHT = 70;
const HEADER_GAP = 14;
const COLS_SEMESTER = [
  { label: "Seat", width: 50 },
  { label: "Name", width: 180 },
  { label: "Roll No", width: 110 },
  { label: "Branch", width: 90 },
  { label: "Year", width: 40 }
];
const COLS_MID = [
  { label: "Seat", width: 45 },
  { label: "Name 1", width: 110 },
  { label: "Roll 1", width: 70 },
  { label: "Branch 1", width: 60 },
  { label: "Name 2", width: 110 },
  { label: "Roll 2", width: 70 },
  { label: "Branch 2", width: 60 }
];

function drawTableHeader(doc, y, columns) {
  let x = doc.page.margins.left;
  doc.fontSize(10).fillColor("#0b0f1a");
  columns.forEach((col) => {
    doc
      .rect(x, y, col.width, ROW_HEIGHT)
      .fillAndStroke("#ffffff", "#0f172a");
    doc
      .font("Helvetica-Bold")
      .fillColor("#0b0f1a")
      .text(col.label, x + 4, y + 6, { width: col.width - 8, align: "left" });
    x += col.width;
  });
  return y + ROW_HEIGHT;
}

function drawTableRow(doc, y, columns, values) {
  let x = doc.page.margins.left;
  doc.font("Helvetica").fillColor("#0f172a");
  columns.forEach((col, idx) => {
    doc.rect(x, y, col.width, ROW_HEIGHT).strokeColor("#0f172a").lineWidth(0.5).stroke();
    doc.text(values[idx], x + 4, y + 6, { width: col.width - 8, align: "left" });
    x += col.width;
  });
  return y + ROW_HEIGHT;
}

function ensureSpace(doc, y, columns, renderHeader) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (y + ROW_HEIGHT > bottom) {
    doc.addPage();
    const headerY = renderHeader();
    return drawTableHeader(doc, headerY, columns);
  }
  return y;
}

function buildSemesterRows(seats, capacity = 30) {
  const labels = buildSeatLabels(capacity);
  const seatMap = new Map(seats.map((seat) => [seat.seat_label, seat]));
  return labels.map((label) => {
    const seat = seatMap.get(label);
    if (!seat || !seat.student_one) {
      return [label, "EMPTY", "-", "-", "-"];
    }
    return [label, seat.student_one.name, seat.student_one.roll_no, seat.student_one.branch, seat.student_one.year];
  });
}

function buildMidRows(seats, capacity = 30) {
  const labels = buildSeatLabels(capacity);
  const seatMap = new Map(seats.map((seat) => [seat.seat_label, seat]));
  return labels.map((label) => {
    const seat = seatMap.get(label);
    if (!seat || !seat.student_one) {
      return [label, "EMPTY", "-", "-", "EMPTY", "-", "-"];
    }
    const s1 = seat.student_one;
    const s2 = seat.student_two;
    return [
      label,
      s1.name,
      s1.roll_no,
      s1.branch,
      s2 ? s2.name : "EMPTY",
      s2 ? s2.roll_no : "-",
      s2 ? s2.branch : "-"
    ];
  });
}

function renderHeader(doc) {
  if (fs.existsSync(HEADER_IMAGE_PATH)) {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.image(HEADER_IMAGE_PATH, doc.page.margins.left, doc.page.margins.top, {
      fit: [pageWidth, HEADER_IMAGE_HEIGHT],
      align: "center"
    });
    return doc.page.margins.top + HEADER_IMAGE_HEIGHT + HEADER_GAP;
  }
  return doc.page.margins.top;
}

function renderMeta(doc, { examType, roomNo, invigilators }, startY) {
  doc.y = startY;
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#0f172a").text("Srinivasa Ramanujan Institute of Technology", {
    align: "center"
  });
  doc.font("Helvetica").fontSize(10).text("AUTONOMOUS", { align: "center" });
  doc.font("Helvetica-Bold").fontSize(11).text("SEATING PLAN", { align: "center" });
  doc.moveDown(0.3);
  doc
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke("#0f172a");
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a");
  doc.text(`Exam Type: ${examType}`);
  doc.text(`Room No: ${roomNo}`);
  if (invigilators?.length) {
    const list = invigilators
      .map((inv) => `${inv.name}${inv.designation ? ` (${inv.designation})` : ""} - ${inv.department}`)
      .join("; ");
    doc.font("Helvetica").text(`Invigilator(s): ${list}`);
  }
  doc.moveDown(0.6);
}

function renderRoom(doc, payload) {
  const { examType, seats, capacity } = payload;
  const columns = examType === "MID" ? COLS_MID : COLS_SEMESTER;
  const headerStart = renderHeader(doc);
  renderMeta(doc, payload, headerStart);
  let y = drawTableHeader(doc, doc.y, columns);
  doc.fontSize(9).fillColor("#0f172a");
  const rows = examType === "MID" ? buildMidRows(seats, capacity) : buildSemesterRows(seats, capacity);
  rows.forEach((row) => {
    y = ensureSpace(doc, y, columns, () => {
      const headerY = renderHeader(doc);
      renderMeta(doc, payload, headerY);
      return doc.y;
    });
    y = drawTableRow(doc, y, columns, row);
  });
}

function bufferFromDoc(doc) {
  return new Promise((resolve) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.end();
  });
}

export async function buildRoomPdf(payload) {
  const doc = new PDFDocument({ margin: 32, size: "A4" });
  renderRoom(doc, payload);
  return bufferFromDoc(doc);
}

export async function buildCombinedPdf({
  examType,
  rooms,
  countsByRoom = {},
  departments
}) {
  const doc = new PDFDocument({ margin: 32, size: "A4" });
  rooms.forEach((room, idx) => {
    if (idx > 0) doc.addPage();
    renderRoom(doc, {
      roomNo: room.room_no,
      examType,
      seats: room.seats,
      capacity: room.capacity,
      invigilators: room.invigilators || [],
      counts: countsByRoom[room.room_no] || { assignedStudents: 0, unassignedStudents: 0, emptySeats: 0 },
      departments
    });
  });
  return bufferFromDoc(doc);
}
