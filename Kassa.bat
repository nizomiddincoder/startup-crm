@echo off
rem ============================================================
rem  Kassa dasturini ishga tushirish (ikki marta bosing).
rem  Baza + sayt yoqiladi va brauzer o'zi ochiladi.
rem  Ishni tugatganda shu qora oynani yoping.
rem ============================================================
chcp 65001 >nul
title Kassa
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [Kassa] Node.js topilmadi.
  echo  https://nodejs.org saytidan "LTS" versiyasini o'rnating va qayta urinib ko'ring.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo  [Kassa] Birinchi ishga tushirish: kerakli fayllar o'rnatilmoqda (bir necha daqiqa)...
  call npm install
  if errorlevel 1 (
    echo.
    echo  [Kassa] O'rnatishda xato. Internetni tekshirib, qayta urinib ko'ring.
    pause
    exit /b 1
  )
)

echo.
echo  [Kassa] Dastur ishga tushmoqda. Brauzer o'zi ochiladi...
echo.
call npm run app

echo.
echo  [Kassa] Dastur to'xtadi.
pause
