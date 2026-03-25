@echo off
title Firebase Deploy — Firestore Rules + Indexes
color 0A

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   InnoPlaybook — Deploy Firestore Rules + Indexes ║
echo  ╚══════════════════════════════════════════════════╝
echo.

cd /d "D:\Inno workspace\inno-playbook"

echo [1/2] Logging in to Firebase...
echo       Browser will open — sign in with scdtheerapan@gmail.com
echo.
call npx firebase login

echo.
echo [2/2] Deploying Firestore Rules + Indexes...
echo.
call npx firebase deploy --only firestore

echo.
echo ══════════════════════════════════════════════════════
echo   Deploy complete! กลับไปทดสอบที่ http://localhost:3000
echo ══════════════════════════════════════════════════════
echo.
pause
