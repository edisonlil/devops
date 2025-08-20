#!/bin/bash

# DevOps 调试安装脚本
# 用于排查安装问题

echo "=== DevOps 调试安装脚本 ==="
echo "脚本启动时间: $(date)"
echo "当前用户: $(whoami)"
echo "当前目录: $(pwd)"
echo "参数: $*"
echo "Shell: $0"
echo "BASH_SOURCE: ${BASH_SOURCE[0]}"
echo

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查基础工具
check_basic_tools() {
    log_step "检查基础工具..."
    
    local tools=("curl" "wget" "git" "unzip")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if command_exists "$tool"; then
            log_info "$tool: 已安装 ✓"
        else
            log_warn "$tool: 未安装 ✗"
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_warn "缺失工具: ${missing_tools[*]}"
        return 1
    fi
    
    return 0
}

# 测试网络连接
test_network() {
    log_step "测试网络连接..."
    
    local github_url="https://github.com/edisonlil/devops"
    local zip_url="${github_url}/archive/refs/heads/dev.zip"
    
    if command_exists curl; then
        log_info "使用 curl 测试连接..."
        if curl -fsSL -I "$zip_url" >/dev/null; then
            log_info "网络连接正常 ✓"
        else
            log_error "无法连接到 GitHub ✗"
            return 1
        fi
    elif command_exists wget; then
        log_info "使用 wget 测试连接..."
        if wget --spider "$zip_url" 2>/dev/null; then
            log_info "网络连接正常 ✓"
        else
            log_error "无法连接到 GitHub ✗"
            return 1
        fi
    else
        log_error "curl 和 wget 都不可用"
        return 1
    fi
    
    return 0
}

# 下载项目
download_project() {
    log_step "下载 DevOps 项目..."
    
    local devops_dir="$HOME/devops"
    local github_url="https://github.com/edisonlil/devops"
    local branch="dev"
    local zip_url="${github_url}/archive/refs/heads/${branch}.zip"
    
    # 检查目标目录
    if [[ -d "$devops_dir" ]]; then
        log_warn "目录 $devops_dir 已存在"
        local backup_dir="${devops_dir}.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "备份到: $backup_dir"
        mv "$devops_dir" "$backup_dir"
    fi
    
    # 创建临时目录
    local temp_dir="/tmp/devops_install_$$"
    log_info "创建临时目录: $temp_dir"
    mkdir -p "$temp_dir"
    cd "$temp_dir"
    
    # 下载文件
    if command_exists curl; then
        log_info "使用 curl 下载..."
        if curl -fsSL -o devops.zip "$zip_url"; then
            log_info "下载成功 ✓"
        else
            log_error "下载失败 ✗"
            return 1
        fi
    elif command_exists wget; then
        log_info "使用 wget 下载..."
        if wget -O devops.zip "$zip_url"; then
            log_info "下载成功 ✓"
        else
            log_error "下载失败 ✗"
            return 1
        fi
    else
        log_error "curl 和 wget 都不可用"
        return 1
    fi
    
    # 检查下载的文件
    if [[ -f "devops.zip" ]]; then
        local file_size=$(wc -c < devops.zip)
        log_info "下载文件大小: $file_size 字节"
        
        if [[ $file_size -lt 1000 ]]; then
            log_error "下载文件太小，可能下载失败"
            cat devops.zip
            return 1
        fi
    else
        log_error "下载文件不存在"
        return 1
    fi
    
    # 解压文件
    log_info "解压文件..."
    if unzip -q devops.zip; then
        log_info "解压成功 ✓"
    else
        log_error "解压失败 ✗"
        return 1
    fi
    
    # 检查解压后的目录
    if [[ -d "devops-${branch}" ]]; then
        log_info "找到项目目录: devops-${branch}"
        ls -la "devops-${branch}/"
    else
        log_error "项目目录不存在"
        ls -la
        return 1
    fi
    
    # 移动到目标位置
    log_info "移动到目标位置: $devops_dir"
    if mv "devops-${branch}" "$devops_dir"; then
        log_info "移动成功 ✓"
    else
        log_error "移动失败 ✗"
        return 1
    fi
    
    # 清理临时文件
    cd - > /dev/null
    rm -rf "$temp_dir"
    
    # 验证安装
    if [[ -d "$devops_dir" && -f "$devops_dir/bin/devops" ]]; then
        log_info "DevOps 项目安装成功 ✓"
        log_info "安装路径: $devops_dir"
        ls -la "$devops_dir/"
        return 0
    else
        log_error "DevOps 项目安装失败 ✗"
        return 1
    fi
}

# 设置环境变量
setup_environment() {
    log_step "设置环境变量..."
    
    local devops_home="$HOME/devops"
    
    # 添加到 .bashrc
    if ! grep -q "DEVOPS_HOME" ~/.bashrc 2>/dev/null; then
        log_info "添加环境变量到 ~/.bashrc"
        cat >> ~/.bashrc << EOF

# DevOps Environment Variables
export DEVOPS_HOME=$devops_home
export PATH=\$PATH:\$DEVOPS_HOME/bin
EOF
        log_info "环境变量添加成功 ✓"
    else
        log_info "环境变量已存在"
    fi
    
    # 设置执行权限
    if [[ -f "$devops_home/bin/devops" ]]; then
        chmod +x "$devops_home/bin"/*
        log_info "设置执行权限 ✓"
    fi
}

# 主函数
main() {
    log_info "开始 DevOps 调试安装..."
    
    # 检查基础工具
    if ! check_basic_tools; then
        log_error "基础工具检查失败，请先安装缺失的工具"
        exit 1
    fi
    
    # 测试网络
    if ! test_network; then
        log_error "网络连接测试失败"
        exit 1
    fi
    
    # 下载项目
    if ! download_project; then
        log_error "项目下载失败"
        exit 1
    fi
    
    # 设置环境
    setup_environment
    
    log_info "调试安装完成！"
    log_info "请运行以下命令重新加载环境变量:"
    log_info "source ~/.bashrc"
    log_info "然后测试: devops -h"
}

# 脚本入口
echo "检查脚本入口条件..."
echo "BASH_SOURCE[0]: ${BASH_SOURCE[0]}"
echo "0: $0"

if [[ "${BASH_SOURCE[0]}" == "${0}" ]] || [[ "${BASH_SOURCE[0]}" == "bash" ]] || [[ -z "${BASH_SOURCE[0]}" ]]; then
    echo "条件满足，执行main函数"
    main "$@"
else
    echo "条件不满足，脚本被sourced"
fi
