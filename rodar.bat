@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo === Crabjeu ===
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo Docker nao esta instalado. Instale o Docker Desktop e execute este arquivo de novo.
  goto :fail
)

docker info >nul 2>&1
if errorlevel 1 (
  echo Abrindo o Docker Desktop...
  if not exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    echo Nao encontrei o Docker Desktop em "C:\Program Files\Docker\Docker".
    goto :fail
  )
  start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  echo Aguardando o Docker ficar pronto. Na primeira vez isso pode levar um ou dois minutos.
  set TRIES=0
  goto :waitdocker
)

goto :banco

:waitdocker
ping -n 4 127.0.0.1 >nul
docker info >nul 2>&1
if not errorlevel 1 goto :banco
set /a TRIES+=1
if %TRIES% GEQ 60 goto :dockerfail
goto :waitdocker

:dockerfail
echo O Docker nao ficou pronto. Abra o Docker Desktop manualmente e execute este arquivo de novo.
goto :fail

:banco
echo [1/3] PostgreSQL
set CRABJEU_DB_PORT=15432
set DATABASE_URL=postgresql+psycopg2://crabjeu:crabjeu@127.0.0.1:%CRABJEU_DB_PORT%/crabjeu
docker compose up -d
if errorlevel 1 goto :fail

echo [2/3] API
where python >nul 2>&1
if errorlevel 1 (
  echo Python nao encontrado no PATH.
  goto :fail
)

set API_PORT=8000
set INICIAR_API=sim
netstat -ano | findstr /C:":8000 " | findstr "LISTENING" >nul
if errorlevel 1 goto :apiporta
echo A porta 8000 ja esta em uso. A API do Crabjeu vai usar a 8001.
set API_PORT=8001
netstat -ano | findstr /C:":8001 " | findstr "LISTENING" >nul
if errorlevel 1 goto :apiporta
powershell -NoProfile -Command "if (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*app.main:app*' -and $_.CommandLine -like '*--port 8001*' }) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo A porta 8001 tambem esta em uso por outro programa. Feche-o e execute de novo.
  goto :fail
)
echo A API do Crabjeu ja esta na porta 8001.
set INICIAR_API=nao
:apiporta

if not exist "backend\.venv\Scripts\python.exe" (
  python -m venv "backend\.venv"
  if errorlevel 1 goto :fail
)

"backend\.venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"
if errorlevel 1 goto :fail

if /I not "%INICIAR_API%"=="sim" goto :expo
start "Crabjeu API" /D "%~dp0backend" cmd /k "set DATABASE_URL=postgresql+psycopg2://crabjeu:crabjeu@127.0.0.1:%CRABJEU_DB_PORT%/crabjeu&& call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port %API_PORT%"
:expo

echo [3/3] Aplicativo
where npm >nul 2>&1
if errorlevel 1 (
  echo Node.js nao encontrado no PATH. A API foi iniciada, mas o app Expo nao.
  goto :fail
)

if not exist "mobile\node_modules\" (
  pushd mobile
  call npm install
  if errorlevel 1 (
    popd
    goto :fail
  )
  popd
)

set LAN_IP=127.0.0.1
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -eq 'Wi-Fi' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1 -ExpandProperty IPAddress)"`) do set LAN_IP=%%I

set REDE=
for /f "usebackq delims=" %%C in (`powershell -NoProfile -Command "(Get-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -ErrorAction SilentlyContinue).NetworkCategory"`) do set REDE=%%C
if /I "%REDE%"=="Public" (
  echo Aviso: o Wi-Fi esta como rede Publica. O celular pode nao abrir o app.
  echo Marque essa rede como Privada nas configuracoes do Windows.
)

netstat -ano | findstr /C:":8081 " | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo O Expo ja esta na porta 8081. Use o QR da janela que ja esta aberta.
  goto :pronto
)

start "Crabjeu App" /D "%~dp0mobile" cmd /k "set NODE_OPTIONS=--use-system-ca&& set EXPO_PACKAGER_PROXY_URL=& set CI=& set EXPO_PUBLIC_API_URL=http://%LAN_IP%:%API_PORT%&& set REACT_NATIVE_PACKAGER_HOSTNAME=%LAN_IP%&& npx expo start --host lan --port 8081"
:pronto

echo.
echo Pronto.
echo API:  http://127.0.0.1:%API_PORT%/docs
echo Celular: exp://%LAN_IP%:8081
echo Aluno: PIN 1234
echo Educador: PIN 4321
echo.
echo No celular, abra o Expo Go e escaneie o QR da janela Crabjeu App.
if /I "%~1"=="--no-pause" exit /b 0
pause
exit /b 0

:fail
echo.
echo Nao foi possivel iniciar o Crabjeu.
if /I "%~1"=="--no-pause" exit /b 1
pause
exit /b 1
