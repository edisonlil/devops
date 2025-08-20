#!/bin/bash

# 测试install-tools功能

echo "=== 测试 install-tools 功能 ==="
echo

DEVOPS_HOME="${DEVOPS_HOME:-$HOME/devops}"
BIN_DIR="$DEVOPS_HOME/bin"

# 设置环境变量
export DEVOPS_HOME
export PATH="$PATH:$BIN_DIR"

echo "DEVOPS_HOME: $DEVOPS_HOME"
echo "BIN_DIR: $BIN_DIR"
echo

# 测试1: 直接调用devops脚本
echo "1. 测试直接调用 devops install-tools --help"
echo "命令: $BIN_DIR/devops install-tools --help"
echo "输出:"
"$BIN_DIR/devops" install-tools --help
echo "返回码: $?"
echo

# 测试2: 通过PATH调用
echo "2. 测试通过PATH调用 devops install-tools --help"
echo "命令: devops install-tools --help"
echo "输出:"
devops install-tools --help
echo "返回码: $?"
echo

# 测试3: 测试其他参数
echo "3. 测试 devops install-tools --check"
echo "命令: devops install-tools --check"
echo "输出:"
devops install-tools --check
echo "返回码: $?"
echo

# 测试4: 测试无参数
echo "4. 测试 devops install-tools (无参数)"
echo "命令: devops install-tools"
echo "输出:"
timeout 10s devops install-tools || echo "命令超时或需要交互"
echo "返回码: $?"
echo

echo "=== 测试完成 ==="
echo

# 测试帮助信息
echo "1. 测试帮助信息..."
echo "命令: devops install-tools --help"
echo "预期: 显示帮助信息"
echo

# 测试环境检查
echo "2. 测试环境检查..."
echo "命令: devops install-tools --check"
echo "预期: 显示当前环境中已安装和缺失的工具"
echo

# 测试安装指定工具
echo "3. 测试安装指定工具..."
echo "命令: devops install-tools --tools git,curl"
echo "预期: 安装git和curl工具"
echo

# 测试Java版本选择
echo "4. 测试Java版本选择..."
echo "命令: devops install-tools --tools java --java-version 8"
echo "预期: 安装Java 8"
echo

echo "5. 测试Java版本选择 (Java 11)..."
echo "命令: devops install-tools --tools java --java-version 11"
echo "预期: 安装Java 11"
echo

# 使用说明
cat << 'EOF'
=== 使用说明 ===

新增的 install-tools 功能支持以下命令：

1. 交互式安装（推荐）：
   devops install-tools

2. 检查环境状态：
   devops install-tools --check

3. 安装所有工具：
   devops install-tools --all

4. 安装指定工具：
   devops install-tools --tools docker,kubectl,java

5. 安装指定版本的Java：
   devops install-tools --tools java --java-version 8   # 默认
   devops install-tools --tools java --java-version 11
   devops install-tools --tools java --java-version 17
   devops install-tools --tools java --java-version 21

6. 显示帮助：
   devops install-tools --help

=== 支持的工具 ===

基础工具: git, curl, wget, unzip
容器工具: docker, docker-compose
K8s工具:  kubectl, helm
Java工具: java, maven, gradle
Node工具: node, npm, yarn
其他工具: go, expect

=== 特性 ===

1. 自动检测操作系统并使用合适的包管理器
2. 支持多种Java版本选择（默认JDK 8）
3. 使用SDKMAN!管理Java工具链
4. 彩色输出，清晰的状态提示
5. 跳过已安装的工具
6. 详细的安装结果报告

EOF
