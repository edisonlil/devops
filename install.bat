@echo off
setlocal enabledelayedexpansion

REM DevOps 一键安装脚本 (Windows版本)
REM 作者: edison, srillia
REM 版本: 1.0.0

echo.
echo ========================================
echo    DevOps 一键安装脚本 (Windows)
echo ========================================
echo.

REM 检查管理员权限
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] 检测到管理员权限
) else (
    echo [WARN] 建议以管理员身份运行此脚本以获得最佳体验
    pause
)

REM 设置变量
set "DEVOPS_HOME=%~dp0"
set "DEVOPS_HOME=%DEVOPS_HOME:~0,-1%"

echo [INFO] DevOps 安装目录: %DEVOPS_HOME%

REM 检查 PowerShell 是否可用
powershell -Command "Get-Host" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] PowerShell 不可用，请确保 PowerShell 已安装
    pause
    exit /b 1
)

echo [STEP] 检查系统环境...

REM 检查 Git
git --version >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Git 已安装
    git --version
) else (
    echo [WARN] Git 未安装，请从 https://git-scm.com/download/win 下载安装
)

REM 检查 Docker
docker --version >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Docker 已安装
    docker --version
) else (
    echo [WARN] Docker 未安装，请从 https://www.docker.com/products/docker-desktop 下载安装
)

REM 检查 Java
java -version >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Java 已安装
    java -version
) else (
    echo [WARN] Java 未安装，请从 https://adoptium.net/ 下载安装 JDK 11+
)

REM 检查 Maven
mvn -version >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Maven 已安装
    mvn -version
) else (
    echo [WARN] Maven 未安装，请从 https://maven.apache.org/download.cgi 下载安装
)

REM 检查 Node.js
node --version >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Node.js 已安装
    node --version
    npm --version
) else (
    echo [WARN] Node.js 未安装，请从 https://nodejs.org/ 下载安装
)

echo.
echo [STEP] 配置环境变量...

REM 检查环境变量是否已存在
echo %PATH% | findstr /i "%DEVOPS_HOME%\bin" >nul
if %errorLevel% neq 0 (
    echo [INFO] 添加 DevOps 到系统 PATH
    
    REM 使用 PowerShell 添加到用户环境变量
    powershell -Command "[Environment]::SetEnvironmentVariable('DEVOPS_HOME', '%DEVOPS_HOME%', 'User')"
    powershell -Command "$path = [Environment]::GetEnvironmentVariable('PATH', 'User'); if ($path -notlike '*%DEVOPS_HOME%\bin*') { [Environment]::SetEnvironmentVariable('PATH', $path + ';%DEVOPS_HOME%\bin', 'User') }"
    
    echo [INFO] 环境变量已添加到用户配置
) else (
    echo [INFO] DevOps 已在 PATH 中
)

echo.
echo [STEP] 创建必要的目录...

REM 创建用户配置目录
if not exist "%USERPROFILE%\.devops" (
    mkdir "%USERPROFILE%\.devops"
    echo [INFO] 创建目录: %USERPROFILE%\.devops
)

if not exist "%USERPROFILE%\.deploy" (
    mkdir "%USERPROFILE%\.deploy"
    echo [INFO] 创建目录: %USERPROFILE%\.deploy
)

REM 复制示例配置文件
if exist "workspace\deploy-target.sample" (
    copy "workspace\deploy-target.sample" "%USERPROFILE%\.deploy\deploy-target.sample" >nul
    echo [INFO] 示例配置文件已复制到 %USERPROFILE%\.deploy\
)

echo.
echo [STEP] 验证安装...

set "errors=0"

REM 检查 devops 脚本
if exist "bin\devops" (
    echo [INFO] ✓ devops 脚本可用
) else (
    echo [ERROR] ✗ devops 脚本不可用
    set /a errors+=1
)

REM 检查必要的命令
for %%c in (git docker java node) do (
    %%c --version >nul 2>&1
    if !errorLevel! == 0 (
        echo [INFO] ✓ %%c 可用
    ) else (
        echo [WARN] ✗ %%c 不可用
        set /a errors+=1
    )
)

echo.
if %errors% == 0 (
    echo [INFO] 所有组件验证通过！
) else (
    echo [WARN] 发现 %errors% 个问题，请检查安装
)

echo.
echo ========================================
echo           安装完成！
echo ========================================
echo.
echo 使用说明:
echo 1. 重新打开命令提示符或 PowerShell 以加载新的环境变量
echo 2. 或者运行: refreshenv (如果安装了 Chocolatey)
echo.
echo 示例命令:
echo   devops run java --git-url https://github.com/example/project.git --build-tool maven my-project
echo   devops run vue --git-url https://github.com/example/vue-project.git --dockerfile node my-vue-app
echo.
echo 配置文件:
echo   - 工作空间配置: workspace\enable
echo   - 部署目标配置: %USERPROFILE%\.deploy\deploy-target.sample
echo.
echo 更多帮助: devops -h
echo.

pause
