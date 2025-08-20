#!/bin/bash

# DevOps 调试脚本

echo "=== DevOps 调试脚本 ==="
echo

# 设置调试模式
set -x

DEVOPS_HOME="${DEVOPS_HOME:-$HOME/devops}"
BIN_DIR="$DEVOPS_HOME/bin"

echo "DEVOPS_HOME: $DEVOPS_HOME"
echo "BIN_DIR: $BIN_DIR"
echo "参数: $*"
echo

# 检查文件是否存在
echo "检查关键文件:"
files=(
    "$BIN_DIR/devops"
    "$BIN_DIR/log.sh"
    "$BIN_DIR/tools.sh"
    "$BIN_DIR/env.sh"
    "$BIN_DIR/build.sh"
    "$BIN_DIR/install_tools.sh"
)

for file in "${files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (缺失)"
        exit 1
    fi
done

echo
echo "测试单独加载脚本:"

# 测试加载log.sh
echo "1. 测试加载 log.sh"
if source "$BIN_DIR/log.sh"; then
    echo "  ✓ log.sh 加载成功"
    info "测试info函数"
else
    echo "  ✗ log.sh 加载失败"
    exit 1
fi

# 测试加载tools.sh
echo "2. 测试加载 tools.sh"
if source "$BIN_DIR/tools.sh"; then
    echo "  ✓ tools.sh 加载成功"
else
    echo "  ✗ tools.sh 加载失败"
    exit 1
fi

# 测试加载env.sh
echo "3. 测试加载 env.sh"
if source "$BIN_DIR/env.sh"; then
    echo "  ✓ env.sh 加载成功"
else
    echo "  ✗ env.sh 加载失败"
    exit 1
fi

# 测试加载install_tools.sh
echo "4. 测试加载 install_tools.sh"
if source "$BIN_DIR/install_tools.sh"; then
    echo "  ✓ install_tools.sh 加载成功"
else
    echo "  ✗ install_tools.sh 加载失败"
    exit 1
fi

echo
echo "测试函数是否存在:"

# 检查install_tools函数
if declare -f install_tools >/dev/null; then
    echo "  ✓ install_tools 函数存在"
else
    echo "  ✗ install_tools 函数不存在"
fi

# 检查show_install_help函数
if declare -f show_install_help >/dev/null; then
    echo "  ✓ show_install_help 函数存在"
else
    echo "  ✗ show_install_help 函数不存在"
fi

echo
echo "测试参数解析:"

# 模拟参数解析
declare -A env
env[cmd_1]="install-tools"
env[cmd_2]="--help"
env[opt_install_help]="true"

echo "  env[cmd_1]: ${env[cmd_1]}"
echo "  env[cmd_2]: ${env[cmd_2]}"
echo "  env[opt_install_help]: ${env[opt_install_help]}"

echo
echo "测试直接调用函数:"

# 直接调用show_install_help
echo "调用 show_install_help:"
if show_install_help; then
    echo "  ✓ show_install_help 调用成功"
else
    echo "  ✗ show_install_help 调用失败"
fi

echo
echo "=== 调试完成 ==="

# 关闭调试模式
set +x
