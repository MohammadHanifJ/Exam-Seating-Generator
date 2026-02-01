# Exam Seating Arrangement System

## 1) Project Overview
This project is a full‑stack college examination seating system that lets an admin upload students (CSV/XLSX), review and approve eligibility, generate seating for Mid/Semester exams, preview seat grids and tables, and export/email professional PDFs. An Android WebView wrapper is included to ship the same web app as an APK.

Key features:
- CSV/XLSX upload with duplicate roll‑no handling
- Post‑upload review (approve/block) with filters + search
- Branch + Year group selection (explicit pairing)
- Seating generation for Mid & Semester exams
- Dynamic seat labels for any room capacity (A0–E5, then F0–F5, etc.)
- Visual grid + tabular preview
- Combined or per‑room PDF export
- Email PDF delivery
- Invigilator assignment per room
- Android WebView wrapper (APK)

## 2) Tech Stack
Frontend:
- React (Vite)
- Tailwind CSS

Backend:
- Node.js + Express

Database:
- Neon PostgreSQL (pg)

Mobile:
- Android (Kotlin) WebView wrapper

## 3) Prerequisites
- Node.js 18+ (recommended)
- Git
- Neon PostgreSQL account (free tier works)
- Android Studio (optional, for APK build)

## 4) Installation Guide (Step‑by‑Step)
1. Clone the repository
```
git clone <your-repo-url>
cd exam-seating
```

2. Install dependencies
```
cd server
npm install
cd ..\client
npm install
```

3. Create environment files from templates
```
copy server\.env.example server\.env
copy client\.env.example client\.env
```

4. Fill environment variables
Use the example values as a guide and replace with your real credentials:
- `server/.env` (database + email):
  - `DATABASE_URL` — your Neon connection string
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — your SMTP settings
  - `SMTP_FROM` — email sender, format: `Exam Seating <you@example.com>`
  - `ADMIN_TOKEN_SECRET` — any long random string
- `client/.env` (optional):
  - `VITE_API_URL` — backend URL (default `http://localhost:3001/api`)

## 5) Running the Application (Local)
Backend:
```
cd server
npm run dev
```
Runs at: `http://localhost:3001`

Frontend:
```
cd client
npm run dev
```
Runs at: `http://localhost:5173`

Initialize DB (one‑time):
```
http://localhost:3001/api/setup
```

## 6) Running the Android App
1. Open `exam-seating-mobile/` in Android Studio
2. Change the WebView URL:
   - `exam-seating-mobile/app/src/main/java/com/examseating/app/MainActivity.kt`
   - Update `WEB_APP_URL`
3. Build APK:
   - Android Studio → Build → Build APK(s)

## 7) Deployment (Optional)
Suggested approach:
- Backend: Render / Railway / Fly.io
- Frontend: Netlify / Vercel
- Database: Neon

Update `VITE_API_URL` with the deployed backend URL.

## 8) Common Errors & Fixes
- **Database connection errors**: verify `DATABASE_URL` and network access.
- **ENV not loading**: restart dev server after editing `.env`.
- **API connection refused**: backend not running or wrong URL.
- **CSV upload issues**: ensure columns are `name, roll_no, branch, year`.

## 9) Security Notes
- `.env` files contain secrets and are **never committed**.
- `node_modules/` is ignored to keep the repo clean.

## 10) Author / College Project Note
This is a college project intended for academic and demonstration use. Customize for production environments as needed.


## Sample Data
CSV samples in repo root:
- `students_sample.csv`
- `students_sample_50_per_branch_all_years.csv`
- `students_sample_100_per_branch_all_years.csv`
