#!/bin/bash

# DevOps 命令测试脚本

echo "=== DevOps 命令测试 ==="
echo

# 设置环境变量
export DEVOPS_HOME="$HOME/devops"
export PATH="$PATH:$DEVOPS_HOME/bin"

echo "DEVOPS_HOME: $DEVOPS_HOME"
echo "PATH: $PATH"
echo

# 检查文件是否存在
echo "检查关键文件:"
files=(
    "$DEVOPS_HOME/bin/devops"
    "$DEVOPS_HOME/bin/log.sh"
    "$DEVOPS_HOME/bin/tools.sh"
    "$DEVOPS_HOME/bin/env.sh"
    "$DEVOPS_HOME/bin/build.sh"
    "$DEVOPS_HOME/bin/install_tools.sh"
)

for file in "${files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (缺失)"
    fi
done

echo

# 检查执行权限
echo "检查执行权限:"
if [[ -x "$DEVOPS_HOME/bin/devops" ]]; then
    echo "  ✓ devops 有执行权限"
else
    echo "  ✗ devops 没有执行权限"
    echo "  修复: chmod +x $DEVOPS_HOME/bin/devops"
fi

echo

# 测试基本命令
echo "测试基本命令:"

echo "1. 测试 devops -h"
if devops -h 2>/dev/null; then
    echo "  ✓ devops -h 成功"
else
    echo "  ✗ devops -h 失败"
fi

echo

echo "2. 测试 devops install-tools --help"
if devops install-tools --help 2>/dev/null; then
    echo "  ✓ devops install-tools --help 成功"
else
    echo "  ✗ devops install-tools --help 失败"
fi

echo

echo "3. 测试 devops install-tools --check"
if devops install-tools --check 2>/dev/null; then
    echo "  ✓ devops install-tools --check 成功"
else
    echo "  ✗ devops install-tools --check 失败"
fi

echo
echo
echo "=== 故障排除建议 ==="

if [[ ! -f "$DEVOPS_HOME/bin/devops" ]]; then
    echo "问题: DevOps 脚本不存在"
    echo "解决: 重新运行安装脚本"
    echo "  curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash -s -- --script-only"
fi

if [[ ! -x "$DEVOPS_HOME/bin/devops" ]]; then
    echo "问题: DevOps 脚本没有执行权限"
    echo "解决: chmod +x $DEVOPS_HOME/bin/*"
fi

if ! grep -q "DEVOPS_HOME" ~/.bashrc 2>/dev/null; then
    echo "问题: 环境变量未设置"
    echo "解决: 手动添加到 ~/.bashrc:"
    echo "  echo 'export DEVOPS_HOME=$HOME/devops' >> ~/.bashrc"
    echo "  echo 'export PATH=\$PATH:\$DEVOPS_HOME/bin' >> ~/.bashrc"
    echo "  source ~/.bashrc"
fi

echo
echo "=== 测试完成 ==="
