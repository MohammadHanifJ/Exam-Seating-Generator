# Database Schema

## students
- id (PK)
- name
- roll_no (unique)
- branch
- year
- approved
- blocked
- active

## classrooms
- room_no (PK)
- capacity
- active

## seating
- id (PK)
- batch_id
- exam_type
- year
- room_no
- seat_label
- student_one_id
- student_two_id
- created_at

## invigilators
- id (PK)
- name
- department
- designation
- active

## room_invigilators
- id (PK)
- batch_id
- room_no
- invigilator_id
- created_at
