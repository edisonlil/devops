@echo off
echo Starting DevOps Web Application...
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM 检查 npm 是否安装
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo Node.js and npm are available
echo.

REM 安装后端依赖
echo Installing backend dependencies...
cd backend
if not exist node_modules (
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install backend dependencies
        pause
        exit /b 1
    )
)

REM 安装前端依赖
echo Installing frontend dependencies...
cd ..\frontend
if not exist node_modules (
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

echo.
echo Dependencies installed successfully!
echo.

REM 启动后端服务
echo Starting backend server...
cd ..\backend
start "DevOps Backend" cmd /k "npm start"

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 启动前端开发服务器
echo Starting frontend development server...
cd ..\frontend
start "DevOps Frontend" cmd /k "npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Press any key to open the application in browser...
pause >nul

REM 打开浏览器
start http://localhost:5173

echo.
echo DevOps Web Application is running!
echo Press any key to exit...
pause >nul
