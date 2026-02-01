# API Reference (Core)

Base URL: `http://localhost:3001/api`

## Students
- `POST /upload-students`
- `GET /students?branch=&year=&status=`
- `PATCH /students/:id/approve`
- `PATCH /students/:id/block`
- `PATCH /students/approve-all`

## Seating
- `POST /generate`
- `GET /seating/:batchId`
- `GET /seating/:batchId/pdf`
- `GET /seating/:batchId/pdf?room=ROOM_NO`
- `POST /seating/:batchId/email`

## Rooms
- `GET /classrooms`
- `POST /classrooms`

## Branches
- `GET /branches`

## Invigilators
- `GET /invigilators`
- `POST /invigilators`
- `DELETE /invigilators/:id`
