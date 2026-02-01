import { Readable } from "stream";
import csv from "csv-parser";
import ExcelJS from "exceljs";

export async function parseStudentFile(file) {
  if (!file) throw new Error("File is required");
  const ext = file.originalname.toLowerCase().split(".").pop();
  if (ext === "csv") {
    return parseCsv(file.buffer);
  }
  if (ext === "xlsx") {
    return parseXlsx(file.buffer);
  }
  throw new Error("Unsupported file type");
}

function normalizeRow(row) {
  return {
    name: String(row.name || "").trim(),
    roll_no: String(row.roll_no || row.roll || "").trim(),
    branch: String(row.branch || "").trim(),
    year: String(row.year || "").trim()
  };
}

function parseCsv(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    Readable.from(buffer)
      .pipe(csv())
      .on("data", (data) => results.push(normalizeRow(data)))
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
}

async function parseXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const headerRow = sheet.getRow(1);
  const headers = headerRow.values
    .slice(1)
    .map((value) => String(value || "").trim().toLowerCase());
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = {};
    headers.forEach((header, index) => {
      values[header] = row.getCell(index + 1).value || "";
    });
    rows.push(normalizeRow(values));
  });
  return rows;
}

export function validateStudents(rows) {
  const errors = [];
  const valid = [];
  rows.forEach((row, idx) => {
    if (!row.name || !row.roll_no || !row.branch || !row.year) {
      errors.push({ index: idx, row });
      return;
    }
    valid.push(row);
  });
  return { valid, errors };
}
