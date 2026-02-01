# Getting Started

## Prerequisites
- Node.js 18+
- Git
- Neon PostgreSQL account

## Install
```
cd exam-seating\server
npm install
cd ..\client
npm install
```

## Environment
Copy templates and fill values:
```
copy server\.env.example server\.env
copy client\.env.example client\.env
```

## Run
Backend:
```
cd exam-seating\server
npm run dev
```
Frontend:
```
cd exam-seating\client
npm run dev
```

## Initialize DB
Open once:
```
http://localhost:3001/api/setup
```
