import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      roll_no TEXT NOT NULL UNIQUE,
      branch TEXT NOT NULL,
      year TEXT NOT NULL,
      approved BOOLEAN NOT NULL DEFAULT FALSE,
      blocked BOOLEAN NOT NULL DEFAULT FALSE,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  // Ensure existing databases get the new approval flags.
  await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE;`);
  await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT FALSE;`);

  await query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS classrooms (
      room_no TEXT PRIMARY KEY,
      block_name TEXT NOT NULL DEFAULT 'Unknown Block',
      floor_name TEXT NOT NULL DEFAULT 'Ground Floor',
      capacity INT NOT NULL DEFAULT 30,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  // Backward compatible: add block/floor if missing and set safe defaults.
  await query(`ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS block_name TEXT NOT NULL DEFAULT 'Unknown Block';`);
  await query(`ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS floor_name TEXT NOT NULL DEFAULT 'Ground Floor';`);
  await query(`UPDATE classrooms SET block_name = 'Unknown Block' WHERE block_name IS NULL;`);
  await query(`UPDATE classrooms SET floor_name = 'Ground Floor' WHERE floor_name IS NULL;`);

  await query(`
    CREATE TABLE IF NOT EXISTS invigilators (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      designation TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS room_invigilators (
      id SERIAL PRIMARY KEY,
      batch_id UUID NOT NULL,
      room_no TEXT NOT NULL,
      invigilator_id INT NOT NULL REFERENCES invigilators(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS timetables (
      id SERIAL PRIMARY KEY,
      department TEXT NOT NULL,
      year TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      exam_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      exam_type TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS seating (
      id SERIAL PRIMARY KEY,
      batch_id UUID NOT NULL,
      exam_type TEXT NOT NULL,
      year TEXT NOT NULL,
      room_no TEXT NOT NULL,
      seat_label TEXT NOT NULL,
      student_one_id INT NOT NULL REFERENCES students(id),
      student_two_id INT REFERENCES students(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}
