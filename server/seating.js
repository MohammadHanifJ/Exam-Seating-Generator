const ROWS = ["0", "1", "2", "3", "4", "5"];

function columnLabel(index) {
  // 0 -> A, 1 -> B ... 25 -> Z, 26 -> AA
  let n = index;
  let label = "";
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Avoid seating adjacent roll numbers by checking numeric suffixes.
function extractRollNumber(rollNo) {
  const match = String(rollNo || "").match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : null;
}

function isAdjacentRoll(rollA, rollB) {
  const a = extractRollNumber(rollA);
  const b = extractRollNumber(rollB);
  if (a === null || b === null) return false;
  return Math.abs(a - b) === 1;
}

// Pick a student whose roll number is not adjacent to recent rolls.
function pickNonAdjacent(list, avoidRolls) {
  const avoid = avoidRolls.filter(Boolean);
  const idx = list.findIndex((student) => !avoid.some((roll) => isAdjacentRoll(student.roll_no, roll)));
  if (idx === -1) return null;
  const [picked] = list.splice(idx, 1);
  return picked;
}

// Prefer a different branch for mid-exam pair while avoiding adjacent rolls.
function pickNonAdjacentWithBranch(list, avoidRolls, branch) {
  const avoid = avoidRolls.filter(Boolean);
  const idx = list.findIndex(
    (student) => student.branch !== branch && !avoid.some((roll) => isAdjacentRoll(student.roll_no, roll))
  );
  if (idx === -1) return null;
  const [picked] = list.splice(idx, 1);
  return picked;
}

export function buildSeatLabels(capacity = 30) {
  const cols = Math.ceil(capacity / ROWS.length);
  const labels = [];
  for (let c = 0; c < cols; c += 1) {
    const col = columnLabel(c);
    for (const row of ROWS) {
      if (labels.length >= capacity) break;
      labels.push(`${col}${row}`);
    }
  }
  return labels;
}

export function prepareStudents(list) {
  // Randomize seating pool before assignment.
  return shuffle(list);
}

export function generateSemesterSeating({ roomNo, studentsOne, studentsTwo, capacity = 30 }) {
  const seats = buildSeatLabels(capacity);
  const output = [];
  let lastRoll = null;
  for (let i = 0; i < seats.length; i += 1) {
    const source = i % 2 === 0 ? studentsOne : studentsTwo;
    const student = pickNonAdjacent(source, [lastRoll]);
    if (!student) {
      output.push({ room_no: roomNo, seat_label: seats[i], student_one: null, student_two: null });
      continue;
    }
    lastRoll = student.roll_no;
    output.push({ room_no: roomNo, seat_label: seats[i], student_one: student, student_two: null });
  }
  return output;
}

export function generateMidSeating({ roomNo, students, capacity = 30 }) {
  const seats = buildSeatLabels(capacity);
  const output = [];
  let lastRoll = null;
  for (let i = 0; i < seats.length; i += 1) {
    const studentOne = pickNonAdjacent(students, [lastRoll]);
    if (!studentOne) {
      output.push({ room_no: roomNo, seat_label: seats[i], student_one: null, student_two: null });
      continue;
    }
    const studentTwo = pickNonAdjacentWithBranch(students, [lastRoll, studentOne.roll_no], studentOne.branch);
    lastRoll = studentTwo?.roll_no || studentOne.roll_no;
    output.push({
      room_no: roomNo,
      seat_label: seats[i],
      student_one: studentOne,
      student_two: studentTwo || null
    });
  }
  return output;
}

export function countSeatsFilled(seats) {
  return seats.filter((seat) => seat.student_one).length;
}
