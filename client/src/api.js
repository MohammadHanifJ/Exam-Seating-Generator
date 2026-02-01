const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

async function request(path, options = {}) {
  try {
    const token = localStorage.getItem("adminToken");
    const headers = { ...(options.headers || {}) };
    if (token) {
      headers["x-admin-token"] = token;
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  } catch (err) {
    if (err.name === "TypeError") {
      throw new Error("Unable to reach server. Check that the backend is running.");
    }
    throw err;
  }
}

export async function uploadStudents(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/upload-students", { method: "POST", body: formData });
}

export async function getBranches(year) {
  return request(`/branches?year=${encodeURIComponent(year)}`);
}

export async function getClassrooms() {
  return request("/classrooms");
}

export async function addClassroom(room) {
  return request("/classrooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(room)
  });
}

export async function generateSeating(payload) {
  return request("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function getSeating(batchId) {
  return request(`/seating/${batchId}`);
}

export function pdfUrl(batchId, room) {
  const roomParam = room ? `?room=${encodeURIComponent(room)}` : "";
  const token = localStorage.getItem("adminToken");
  const tokenParam = token ? `${roomParam ? "&" : "?"}token=${encodeURIComponent(token)}` : "";
  return `${API_BASE}/seating/${batchId}/pdf${roomParam}${tokenParam}`;
}

export async function sendEmail(batchId, recipients) {
  return request(`/seating/${batchId}/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipients })
  });
}

export async function getInvigilators() {
  return request("/invigilators");
}

export async function addInvigilator(payload) {
  return request("/invigilators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function deleteInvigilator(id) {
  return request(`/invigilators/${id}`, { method: "DELETE" });
}

export async function getTimetables(filters = {}) {
  const params = new URLSearchParams(filters);
  return request(`/timetables?${params.toString()}`);
}

export async function addTimetable(payload) {
  return request("/timetables", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function updateTimetable(id, payload) {
  return request(`/timetables/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function deleteTimetable(id) {
  return request(`/timetables/${id}`, { method: "DELETE" });
}

export async function getStudents(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.append(key, value);
  });
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request(`/students${suffix}`);
}

export async function approveStudent(id) {
  return request(`/students/${id}/approve`, { method: "PATCH" });
}

export async function blockStudent(id) {
  return request(`/students/${id}/block`, { method: "PATCH" });
}

export async function approveAllStudents() {
  return request("/students/approve-all", { method: "PATCH" });
}

export async function adminRegister(email, password) {
  return request("/admin/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
}

export async function adminLogin(email, password) {
  return request("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
}
