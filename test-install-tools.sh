#!/bin/bash

# DevOps install-tools 功能测试脚本

echo "=== DevOps install-tools 功能测试 ==="
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
