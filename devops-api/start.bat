@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 DevOps API 启动脚本
echo ======================

REM 检查 Node.js 是否安装
echo 📋 检查系统环境...
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装，请先安装 Node.js ^>= 18.0.0
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%

REM 检查是否存在 package.json
if not exist "package.json" (
    echo ❌ 未找到 package.json 文件，请确保在正确的目录下运行此脚本
    pause
    exit /b 1
)

REM 安装依赖
echo 📦 安装依赖...
where yarn >nul 2>&1
if errorlevel 1 (
    echo 使用 npm 安装依赖...
    npm install
) else (
    echo 使用 yarn 安装依赖...
    yarn install
)

if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

REM 创建环境变量文件
if not exist ".env" (
    echo ⚙️  创建环境变量文件...
    copy ".env.example" ".env" >nul
    echo ✅ 已创建 .env 文件，请根据需要修改配置
) else (
    echo ✅ 环境变量文件已存在
)

REM 创建必要目录
echo 📁 创建必要目录...
if not exist "data" mkdir data
if not exist "data\workspaces" mkdir data\workspaces
if not exist "data\templates" mkdir data\templates
if not exist "logs" mkdir logs
echo ✅ 目录创建完成

REM 检查端口是否被占用
set PORT=8080
netstat -an | find ":%PORT%" | find "LISTENING" >nul
if not errorlevel 1 (
    echo ⚠️  端口 %PORT% 已被占用，请修改 .env 文件中的 PORT 配置
    echo 或者使用任务管理器结束占用端口的进程
)

echo.
echo 🎉 准备工作完成！
echo.
echo 启动命令：
echo   开发模式: npm run dev
echo   生产模式: npm run build ^&^& npm start
echo   运行测试: npm test
echo.
echo 访问地址：
echo   健康检查: http://localhost:%PORT%/health
echo   API 文档: http://localhost:%PORT%/docs
echo.

REM 询问是否立即启动
set /p choice="是否立即启动开发服务器？(y/N): "
if /i "%choice%"=="y" (
    echo 🚀 启动开发服务器...
    where yarn >nul 2>&1
    if errorlevel 1 (
        npm run dev
    ) else (
        yarn dev
    )
) else (
    echo 👋 稍后可以使用 'npm run dev' 启动服务器
    pause
)
