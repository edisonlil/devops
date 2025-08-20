#!/bin/bash

# 修复DevOps脚本中的相对路径问题

echo "=== 修复DevOps脚本路径问题 ==="

DEVOPS_HOME="${DEVOPS_HOME:-$HOME/devops}"
BIN_DIR="$DEVOPS_HOME/bin"

if [[ ! -d "$BIN_DIR" ]]; then
    echo "错误: DevOps bin目录不存在: $BIN_DIR"
    exit 1
fi

echo "DevOps目录: $DEVOPS_HOME"
echo "Bin目录: $BIN_DIR"
echo

# 检查并修复权限
echo "1. 检查并修复执行权限..."
chmod +x "$BIN_DIR"/* 2>/dev/null
echo "   ✓ 执行权限已设置"

# 检查关键文件
echo "2. 检查关键文件..."
required_files=(
    "$BIN_DIR/devops"
    "$BIN_DIR/log.sh"
    "$BIN_DIR/tools.sh"
    "$BIN_DIR/env.sh"
    "$BIN_DIR/build.sh"
    "$BIN_DIR/install_tools.sh"
    "$BIN_DIR/devops_help"
    "$BIN_DIR/docker_helper.sh"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "   ✓ $(basename "$file")"
    else
        echo "   ✗ $(basename "$file") (缺失)"
        missing_files+=("$file")
    fi
done

if [[ ${#missing_files[@]} -gt 0 ]]; then
    echo "错误: 发现缺失文件，请重新安装DevOps"
    exit 1
fi

# 检查环境变量
echo "3. 检查环境变量..."
if [[ -n "$DEVOPS_HOME" ]]; then
    echo "   ✓ DEVOPS_HOME: $DEVOPS_HOME"
else
    echo "   ✗ DEVOPS_HOME 未设置"
fi

if echo "$PATH" | grep -q "$BIN_DIR"; then
    echo "   ✓ PATH 包含 DevOps bin 目录"
else
    echo "   ✗ PATH 不包含 DevOps bin 目录"
    echo "   建议运行: export PATH=\$PATH:$BIN_DIR"
fi

# 测试基本命令
echo "4. 测试基本命令..."

# 测试devops命令
if "$BIN_DIR/devops" -h >/dev/null 2>&1; then
    echo "   ✓ devops -h 成功"
else
    echo "   ✗ devops -h 失败"
    echo "   调试信息:"
    "$BIN_DIR/devops" -h 2>&1 | head -5 | sed 's/^/     /'
fi

# 测试install-tools命令
if "$BIN_DIR/devops" install-tools --help >/dev/null 2>&1; then
    echo "   ✓ devops install-tools --help 成功"
else
    echo "   ✗ devops install-tools --help 失败"
fi

echo
echo "=== 修复完成 ==="
echo
echo "如果仍有问题，请尝试:"
echo "1. 重新加载环境变量: source ~/.bashrc"
echo "2. 手动设置环境变量:"
echo "   export DEVOPS_HOME=$DEVOPS_HOME"
echo "   export PATH=\$PATH:$BIN_DIR"
echo "3. 重新安装DevOps:"
echo "   curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash -s -- --script-only"
