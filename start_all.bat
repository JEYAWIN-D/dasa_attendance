@echo off
echo ========================================================
echo   DASA TECH Smart Employee Attendance Platform
echo ========================================================
echo Starting Backend API Server and Frontend Vite Client...
echo.

start "DASA TECH - Backend Server [Port 5000]" cmd /k "cd server && npm start"
start "DASA TECH - Frontend Client [Port 5180]" cmd /k "cd client && npm run dev"

echo.
echo Both services launched!
echo - Frontend: http://localhost:5180
echo - Backend:  http://localhost:5000
echo ========================================================
pause
