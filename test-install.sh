#!/bin/bash

# DevOps 安装测试脚本
# 用于验证安装是否成功

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_test() { echo -e "${BLUE}[TEST]${NC} $1"; }

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 测试函数
test_command() {
    local cmd=$1
    local name=$2
    local required=${3:-false}
    
    log_test "测试 $name..."
    
    if command_exists $cmd; then
        local version=$($cmd --version 2>&1 | head -n1 || echo "版本信息不可用")
        log_info "✓ $name: $version"
        return 0
    else
        if [[ $required == "true" ]]; then
            log_error "✗ $name (必需)"
            return 1
        else
            log_warn "✗ $name (可选)"
            return 0
        fi
    fi
}

# 测试环境变量
test_environment() {
    log_test "测试环境变量..."

    if [[ -n "$DEVOPS_HOME" ]]; then
        log_info "✓ DEVOPS_HOME: $DEVOPS_HOME"
    else
        log_warn "✗ DEVOPS_HOME 未设置"
    fi

    if echo $PATH | grep -q "devops/bin"; then
        log_info "✓ DevOps bin 目录在 PATH 中"
    else
        log_warn "✗ DevOps bin 目录不在 PATH 中"
    fi

    # 检查 SDKMAN! 环境
    if [[ -d "$HOME/.sdkman" ]]; then
        log_info "✓ SDKMAN! 已安装: $HOME/.sdkman"

        # 检查 SDKMAN! 是否在 PATH 中
        if [[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]]; then
            log_info "✓ SDKMAN! 初始化脚本存在"
        else
            log_warn "✗ SDKMAN! 初始化脚本不存在"
        fi
    else
        log_warn "✗ SDKMAN! 未安装"
    fi
}

# 测试 DevOps 工具
test_devops_tool() {
    log_test "测试 DevOps 工具..."
    
    local devops_script="bin/devops"
    
    if [[ -f "$devops_script" ]]; then
        if [[ -x "$devops_script" ]]; then
            log_info "✓ DevOps 脚本存在且可执行"
            
            # 测试帮助命令
            if $devops_script -h >/dev/null 2>&1; then
                log_info "✓ DevOps 帮助命令正常"
            else
                log_warn "✗ DevOps 帮助命令异常"
            fi
        else
            log_error "✗ DevOps 脚本不可执行"
            return 1
        fi
    else
        log_error "✗ DevOps 脚本不存在"
        return 1
    fi
}

# 测试配置文件
test_configuration() {
    log_test "测试配置文件..."
    
    # 检查工作空间配置
    if [[ -f "workspace/enable" ]]; then
        log_info "✓ 工作空间配置文件存在"
    else
        log_warn "✗ 工作空间配置文件不存在"
    fi
    
    # 检查用户配置目录
    if [[ -d "$HOME/.devops" ]]; then
        log_info "✓ 用户配置目录存在: $HOME/.devops"
    else
        log_warn "✗ 用户配置目录不存在"
    fi
    
    if [[ -d "$HOME/.deploy" ]]; then
        log_info "✓ 部署配置目录存在: $HOME/.deploy"
    else
        log_warn "✗ 部署配置目录不存在"
    fi
}

# 测试 Docker 功能
test_docker_functionality() {
    log_test "测试 Docker 功能..."
    
    if command_exists docker; then
        # 检查 Docker 服务状态
        if systemctl is-active --quiet docker 2>/dev/null; then
            log_info "✓ Docker 服务运行中"
        else
            log_warn "✗ Docker 服务未运行"
        fi
        
        # 测试 Docker 命令
        if docker ps >/dev/null 2>&1; then
            log_info "✓ Docker 命令正常工作"
        else
            log_warn "✗ Docker 命令需要权限或服务未启动"
        fi
        
        # 检查 Docker Compose
        if command_exists docker-compose; then
            log_info "✓ Docker Compose 可用"
        else
            log_warn "✗ Docker Compose 不可用"
        fi
    else
        log_warn "Docker 未安装，跳过功能测试"
    fi
}

# 运行完整测试
run_full_test() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "       DevOps 安装验证测试"
    echo "========================================"
    echo -e "${NC}"
    
    local errors=0
    
    # 基础工具测试
    echo -e "\n${YELLOW}=== 基础工具测试 ===${NC}"
    test_command "git" "Git" true || ((errors++))
    test_command "curl" "cURL" true || ((errors++))
    test_command "wget" "Wget" false
    test_command "unzip" "Unzip" true || ((errors++))
    
    # 开发工具测试
    echo -e "\n${YELLOW}=== 开发工具测试 ===${NC}"
    test_command "docker" "Docker" false

    # 测试 Java 相关工具 (可能通过 SDKMAN! 安装)
    if [[ -d "$HOME/.sdkman" ]]; then
        log_test "检测到 SDKMAN!，初始化环境..."
        source "$HOME/.sdkman/bin/sdkman-init.sh" 2>/dev/null || true
    fi

    test_command "java" "Java" false
    test_command "mvn" "Maven" false
    test_command "gradle" "Gradle" false
    test_command "node" "Node.js" false
    test_command "npm" "NPM" false
    test_command "go" "Go" false
    
    # 环境测试
    echo -e "\n${YELLOW}=== 环境配置测试 ===${NC}"
    test_environment
    
    # DevOps 工具测试
    echo -e "\n${YELLOW}=== DevOps 工具测试 ===${NC}"
    test_devops_tool || ((errors++))
    
    # 配置文件测试
    echo -e "\n${YELLOW}=== 配置文件测试 ===${NC}"
    test_configuration
    
    # Docker 功能测试
    echo -e "\n${YELLOW}=== Docker 功能测试 ===${NC}"
    test_docker_functionality
    
    # 测试结果
    echo -e "\n${BLUE}========================================"
    echo "           测试结果"
    echo "========================================${NC}"
    
    if [[ $errors -eq 0 ]]; then
        log_info "所有必需组件测试通过！DevOps 环境已就绪。"
        echo -e "\n${GREEN}下一步：${NC}"
        echo "1. 重新加载环境变量: source ~/.bashrc"
        echo "2. 运行示例命令: devops -h"
        return 0
    else
        log_error "发现 $errors 个关键问题，请检查安装。"
        echo -e "\n${YELLOW}建议：${NC}"
        echo "1. 重新运行安装脚本"
        echo "2. 检查系统权限和网络连接"
        echo "3. 查看安装日志"
        return 1
    fi
}

# 快速测试
run_quick_test() {
    echo -e "${BLUE}快速测试模式${NC}"
    
    local essential_commands=("git" "docker" "java")
    local errors=0
    
    for cmd in "${essential_commands[@]}"; do
        if command_exists $cmd; then
            log_info "✓ $cmd"
        else
            log_error "✗ $cmd"
            ((errors++))
        fi
    done
    
    test_devops_tool || ((errors++))
    
    if [[ $errors -eq 0 ]]; then
        log_info "快速测试通过！"
    else
        log_error "快速测试失败，发现 $errors 个问题"
    fi
    
    return $errors
}

# 主函数
main() {
    case "${1:-}" in
        --quick|-q)
            run_quick_test
            ;;
        --help|-h)
            echo "DevOps 安装测试脚本"
            echo ""
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --quick, -q    快速测试模式"
            echo "  --help, -h     显示帮助信息"
            echo ""
            echo "默认运行完整测试"
            ;;
        *)
            run_full_test
            ;;
    esac
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
