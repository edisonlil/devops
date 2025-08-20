#!/bin/bash

# DevOps Web 快速启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查环境
check_environment() {
    log_step "检查环境..."
    
    # 检查 Node.js
    if ! command_exists node; then
        log_error "Node.js 未安装，请先安装 Node.js 16+"
        exit 1
    fi
    
    local node_version=$(node -v | sed 's/v//')
    local major_version=$(echo $node_version | cut -d. -f1)
    
    if [ "$major_version" -lt 16 ]; then
        log_error "Node.js 版本过低，需要 16+，当前版本: $node_version"
        exit 1
    fi
    
    log_info "Node.js 版本: $node_version ✓"
    
    # 检查 npm
    if ! command_exists npm; then
        log_error "npm 未安装"
        exit 1
    fi
    
    log_info "npm 版本: $(npm -v) ✓"
    
    # 检查 DevOps 工具
    if [ -z "$DEVOPS_HOME" ]; then
        # 尝试自动检测
        if [ -f "../bin/devops" ]; then
            export DEVOPS_HOME=$(cd .. && pwd)
            log_info "自动检测到 DevOps 路径: $DEVOPS_HOME"
        else
            log_warn "DEVOPS_HOME 环境变量未设置，将使用默认路径"
        fi
    else
        log_info "DevOps 路径: $DEVOPS_HOME ✓"
    fi
}

# 安装依赖
install_dependencies() {
    log_step "安装依赖..."
    
    if [ ! -f "package.json" ]; then
        log_error "package.json 不存在，请确保在 devops-web 目录中运行此脚本"
        exit 1
    fi
    
    # 安装根依赖
    log_info "安装根依赖..."
    npm install
    
    # 安装后端依赖
    log_info "安装后端依赖..."
    cd backend
    npm install
    cd ..
    
    # 安装前端依赖
    log_info "安装前端依赖..."
    cd frontend
    npm install
    cd ..
    
    log_info "依赖安装完成 ✓"
}

# 构建前端
build_frontend() {
    log_step "构建前端..."
    cd frontend
    npm run build
    cd ..
    log_info "前端构建完成 ✓"
}

# 启动服务
start_services() {
    local mode=$1
    
    if [ "$mode" = "dev" ]; then
        log_step "启动开发服务器..."
        log_info "前端地址: http://localhost:5173"
        log_info "后端地址: http://localhost:3000"
        log_info "网络访问: http://YOUR_SERVER_IP:5173"
        log_info "按 Ctrl+C 停止服务"
        npm run dev
    elif [ "$mode" = "prod" ]; then
        log_step "启动生产服务器..."
        log_info "本地访问: http://localhost:3000"
        log_info "网络访问: http://YOUR_SERVER_IP:3000"
        log_info "按 Ctrl+C 停止服务"
        npm start
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
DevOps Web 快速启动脚本

用法: $0 [选项]

选项:
  dev                     启动开发模式（默认）
  prod                    启动生产模式
  build                   仅构建前端
  install                 仅安装依赖
  check                   仅检查环境
  --help, -h              显示此帮助信息

示例:
  $0                      # 启动开发模式
  $0 dev                  # 启动开发模式
  $0 prod                 # 启动生产模式
  $0 build                # 构建前端
  $0 install              # 安装依赖

环境变量:
  DEVOPS_HOME             DevOps 工具安装路径
  PORT                    服务端口（默认: 3000）

EOF
}

# 主函数
main() {
    echo "=== DevOps Web 管理界面 ==="
    echo
    
    case "${1:-dev}" in
        "check")
            check_environment
            ;;
        "install")
            check_environment
            install_dependencies
            ;;
        "build")
            check_environment
            if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
                install_dependencies
            fi
            build_frontend
            ;;
        "dev")
            check_environment
            if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
                install_dependencies
            fi
            start_services "dev"
            ;;
        "prod")
            check_environment
            if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
                install_dependencies
            fi
            if [ ! -d "frontend/dist" ]; then
                build_frontend
            fi
            start_services "prod"
            ;;
        "--help"|"-h")
            show_help
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
