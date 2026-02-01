import PDFDocument from "pdfkit";
import { buildSeatLabels } from "./seating.js";

const ROW_HEIGHT = 22;
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
  doc.fontSize(9).fillColor("#0f172a");
  columns.forEach((col) => {
    doc.rect(x, y, col.width, ROW_HEIGHT).strokeColor("#94a3b8").stroke();
    doc.text(col.label, x + 4, y + 6, { width: col.width - 8, align: "left" });
    x += col.width;
  });
  return y + ROW_HEIGHT;
}

function drawTableRow(doc, y, columns, values) {
  let x = doc.page.margins.left;
  columns.forEach((col, idx) => {
    doc.rect(x, y, col.width, ROW_HEIGHT).strokeColor("#e2e8f0").stroke();
    doc.text(values[idx], x + 4, y + 6, { width: col.width - 8, align: "left" });
    x += col.width;
  });
  return y + ROW_HEIGHT;
}

function ensureSpace(doc, y, columns) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (y + ROW_HEIGHT > bottom) {
    doc.addPage();
    return drawTableHeader(doc, doc.page.margins.top, columns);
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

function renderMeta(doc, { examType, roomNo, invigilators }) {
  doc.fontSize(16).fillColor("#0f172a").text("Srinivasa Ramanujan Institute of Technology", {
    align: "center"
  });
  doc.fontSize(12).text("Examination Seating Arrangement", { align: "center" });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#0f172a");
  doc.text(`Exam Type: ${examType}`);
  doc.text(`Room: ${roomNo}`);
  if (invigilators?.length) {
    const list = invigilators
      .map((inv) => `${inv.name}${inv.designation ? ` (${inv.designation})` : ""} - ${inv.department}`)
      .join("; ");
    doc.text(`Invigilator(s): ${list}`);
  }
  doc.moveDown(0.6);
}

function renderRoom(doc, payload) {
  const { examType, seats, capacity } = payload;
  const columns = examType === "MID" ? COLS_MID : COLS_SEMESTER;
  renderMeta(doc, payload);
  let y = drawTableHeader(doc, doc.y, columns);
  doc.fontSize(9).fillColor("#0f172a");
  const rows = examType === "MID" ? buildMidRows(seats, capacity) : buildSemesterRows(seats, capacity);
  rows.forEach((row) => {
    y = ensureSpace(doc, y, columns);
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
