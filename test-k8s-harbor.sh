#!/bin/bash

# K8s Harbor功能测试脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 测试函数
test_k8s_harbor() {
    log_info "开始测试 K8s Harbor 功能..."
    
    # 1. 创建测试工作空间
    log_info "测试1: 创建带Harbor配置的K8s工作空间"
    echo "请按照提示输入配置信息："
    echo "工作空间名称: test-k8s-harbor"
    echo "平台: 1 (KUBERNETES)"
    echo "命名空间: test"
    echo "启用Harbor: 1"
    echo "Harbor地址: harbor.example.com"
    echo "Harbor项目: testproject"
    echo "Harbor用户名: admin"
    echo "Harbor密码: Harbor12345"
    echo "设为默认: y"
    
    # 模拟交互式输入
    echo -e "test-k8s-harbor\n1\ntest\n1\nharbor.example.com/testproject\nadmin\nHarbor12345\ny" | devops create workspace -i
    
    # 2. 测试Harbor Secret管理
    log_info "测试2: Harbor Secret管理"
    devops env harbor-secret
    
    # 3. 测试构建时的自动Secret创建
    log_info "测试3: 构建时的自动Secret创建"
    # 这里需要有一个实际的Git仓库来测试
    # devops run java test-app --git-url https://github.com/example/test.git --template spring-boot
    
    log_success "K8s Harbor功能测试完成"
}

# 清理函数
cleanup() {
    log_info "清理测试环境..."
    # 删除测试工作空间
    if [ -d "workspace/test-k8s-harbor" ]; then
        rm -rf workspace/test-k8s-harbor
        log_info "已删除测试工作空间"
    fi
}

# 主函数
main() {
    log_info "K8s Harbor功能测试开始"
    
    # 检查devops命令是否可用
    if ! command -v devops >/dev/null 2>&1; then
        log_error "devops命令未找到，请先安装devops工具"
        exit 1
    fi
    
    # 检查kubectl是否可用
    if ! command -v kubectl >/dev/null 2>&1; then
        log_error "kubectl命令未找到，请先安装kubectl"
        exit 1
    fi
    
    # 执行测试
    test_k8s_harbor
    
    log_success "所有测试完成"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
