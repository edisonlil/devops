#!/bin/bash

# 测试devops run -i命令修复效果

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
test_run_interactive() {
    log_info "测试 devops run -i 命令..."
    
    # 检查devops命令是否可用
    if ! command -v devops >/dev/null 2>&1; then
        log_error "devops命令未找到，请先安装devops工具"
        exit 1
    fi
    
    log_info "测试1: devops run -i (不带参数)"
    echo "预期行为：进入交互式模式，提示输入运行类型"
    echo "请手动测试: devops run -i"
    echo ""
    
    log_info "测试2: devops run java -i (带运行类型)"
    echo "预期行为：进入交互式模式，提示输入项目名称和其他参数"
    echo "请手动测试: devops run java -i"
    echo ""
    
    log_info "测试3: devops run java my-app -i (带项目名称)"
    echo "预期行为：进入交互式模式，提示输入其他参数"
    echo "请手动测试: devops run java my-app -i"
    echo ""
    
    log_success "交互式测试需要手动验证，请按照上述命令进行测试"
}

# 检查修复的函数
check_fixes() {
    log_info "检查修复的函数..."
    
    # 检查run_interactive函数是否存在
    if grep -q "function run_interactive()" bin/build.sh; then
        log_success "✅ run_interactive函数存在"
    else
        log_error "❌ run_interactive函数不存在"
    fi
    
    # 检查run函数中的交互式逻辑
    if grep -q "opt_interactive.*true" bin/build.sh; then
        log_success "✅ 交互式逻辑存在"
    else
        log_error "❌ 交互式逻辑不存在"
    fi
    
    # 检查prompt_required函数
    if grep -q "function prompt_required()" bin/tools.sh; then
        log_success "✅ prompt_required函数存在"
    else
        log_error "❌ prompt_required函数不存在"
    fi
    
    # 检查参数解析中的-i选项
    if grep -q "-i|--interactive" bin/env.sh; then
        log_success "✅ 交互式参数解析存在"
    else
        log_error "❌ 交互式参数解析不存在"
    fi
}

# 显示修复内容
show_fixes() {
    log_info "修复内容总结："
    echo ""
    echo "1. 修复了run_interactive函数中的变量引用问题"
    echo "2. 修复了check_post_parmas在交互式模式下的调用问题"
    echo "3. 确保在交互式模式下正确设置环境变量"
    echo "4. 修复了prompt_required函数的变量赋值"
    echo ""
    echo "主要修复点："
    echo "- bin/build.sh: run_interactive函数"
    echo "- bin/build.sh: run_devops函数"
    echo "- bin/tools.sh: prompt_required函数"
    echo "- bin/env.sh: 参数解析逻辑"
}

# 主函数
main() {
    log_info "开始测试devops run -i命令修复效果"
    
    check_fixes
    echo ""
    show_fixes
    echo ""
    test_run_interactive
    
    log_success "测试完成"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
