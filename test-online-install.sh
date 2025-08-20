#!/bin/bash

# DevOps 在线安装测试脚本

echo "=== DevOps 在线安装测试 ==="
echo

# 测试命令
INSTALL_COMMAND="curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash -s -- --script-only"

echo "测试命令:"
echo "$INSTALL_COMMAND"
echo

echo "这个命令将会："
echo "1. 从GitHub下载install.sh脚本"
echo "2. 执行脚本专用安装模式"
echo "3. 自动下载完整的DevOps项目到 \$HOME/devops"
echo "4. 配置环境变量"
echo "5. 设置必要的目录和权限"
echo

echo "安装完成后，您可以："
echo "1. 重新加载环境变量: source ~/.bashrc"
echo "2. 检查环境: devops install-tools --check"
echo "3. 安装开发工具: devops install-tools"
echo "4. 查看帮助: devops -h"
echo

echo "=== 安装模式说明 ==="
echo

echo "1. 脚本专用安装 (推荐用于生产环境):"
echo "   curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash -s -- --script-only"
echo "   - 仅安装DevOps脚本和基础工具"
echo "   - 安装时间: ~1分钟"
echo "   - 后续可使用 devops install-tools 按需安装工具"
echo

echo "2. 标准安装:"
echo "   curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash"
echo "   - 安装DevOps脚本 + Java + Docker + Maven + Gradle"
echo "   - 安装时间: ~10分钟"
echo

echo "3. 完整安装:"
echo "   curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash -s -- --full"
echo "   - 安装所有支持的开发工具"
echo "   - 安装时间: ~20分钟"
echo

echo "=== 安装后验证 ==="
echo

cat << 'EOF'
安装完成后，请执行以下命令验证：

# 重新加载环境变量
source ~/.bashrc

# 检查DevOps命令
devops -h

# 检查环境状态
devops install-tools --check

# 查看已安装的工具
devops install-tools --check | grep "✓"

# 查看缺失的工具
devops install-tools --check | grep "✗"

# 安装缺失的工具（交互式）
devops install-tools

# 或者安装指定工具
devops install-tools --tools docker,kubectl,java

=== 常见问题 ===

Q: 安装失败怎么办？
A: 1. 检查网络连接
   2. 确保有基础工具 (curl, wget, git)
   3. 检查是否有足够的磁盘空间
   4. 查看错误日志

Q: 如何更新DevOps？
A: 重新运行安装命令，旧版本会自动备份

Q: 如何卸载？
A: 1. 删除项目目录: rm -rf $HOME/devops
   2. 清理环境变量: 编辑 ~/.bashrc 删除相关行

Q: 支持哪些操作系统？
A: 主要支持Linux发行版 (Ubuntu, CentOS, RHEL, Debian等)

EOF
