#!/bin/bash

# 快速测试修复结果

echo "=== 快速测试 DevOps 修复结果 ==="
echo

DEVOPS_HOME="${DEVOPS_HOME:-$HOME/devops}"
export DEVOPS_HOME
export PATH="$PATH:$DEVOPS_HOME/bin"

echo "DEVOPS_HOME: $DEVOPS_HOME"
echo

# 测试1: 基本命令
echo "1. 测试基本命令"
echo "命令: devops -h"
if devops -h >/dev/null 2>&1; then
    echo "  ✓ devops -h 成功"
else
    echo "  ✗ devops -h 失败"
    echo "  错误信息:"
    devops -h 2>&1 | head -3 | sed 's/^/    /'
fi

echo

# 测试2: install-tools help
echo "2. 测试 install-tools --help"
echo "命令: devops install-tools --help"
if devops install-tools --help >/dev/null 2>&1; then
    echo "  ✓ devops install-tools --help 成功"
else
    echo "  ✗ devops install-tools --help 失败"
    echo "  错误信息:"
    devops install-tools --help 2>&1 | head -3 | sed 's/^/    /'
fi

echo

# 测试3: install-tools check
echo "3. 测试 install-tools --check"
echo "命令: devops install-tools --check"
if timeout 10s devops install-tools --check >/dev/null 2>&1; then
    echo "  ✓ devops install-tools --check 成功"
else
    echo "  ✗ devops install-tools --check 失败或超时"
    echo "  错误信息:"
    timeout 5s devops install-tools --check 2>&1 | head -3 | sed 's/^/    /'
fi

echo

# 测试4: 语法检查
echo "4. 语法检查"
echo "检查关键脚本语法:"

scripts=(
    "$DEVOPS_HOME/bin/devops"
    "$DEVOPS_HOME/bin/env.sh"
    "$DEVOPS_HOME/bin/install_tools.sh"
    "$DEVOPS_HOME/bin/docker_helper.sh"
)

for script in "${scripts[@]}"; do
    if bash -n "$script" 2>/dev/null; then
        echo "  ✓ $(basename "$script") 语法正确"
    else
        echo "  ✗ $(basename "$script") 语法错误"
        bash -n "$script" 2>&1 | head -2 | sed 's/^/    /'
    fi
done

echo
echo "=== 测试完成 ==="
echo
echo "如果所有测试都通过，说明修复成功！"
echo "如果还有问题，请查看上面的错误信息。"
