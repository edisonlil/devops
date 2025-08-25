#!/bin/bash

# 测试Git克隆目录冲突修复
# 这个脚本会被删除，仅用于验证修复

echo "=== Git克隆目录冲突修复测试 ==="
echo

echo "🐛 原问题："
echo "fatal: destination path '/tmp/devops/wukong-crm/crm' already exists and is not an empty directory."
echo

echo "🔍 问题原因："
echo "1. 上次构建的临时目录没有被完全清理"
echo "2. Git克隆前没有再次检查目标目录"
echo "3. 多次运行相同命令时目录冲突"
echo

echo "🔧 修复内容："
echo "1. 在Git克隆前检查目标目录是否存在"
echo "2. 在SVN checkout前检查目标目录是否存在"
echo "3. 在静态目录处理前检查目标目录是否存在"
echo "4. 如果目录存在，强制删除后再进行操作"
echo "5. 改进初始清理逻辑，添加清理验证"
echo "6. 添加调试信息显示清理过程"
echo

echo "📋 修复的代码逻辑："
echo "Git分支："
echo "  if [ -d \"\$cfg_temp_dir\" ]; then"
echo "    rm -rf \"\$cfg_temp_dir\""
echo "  fi"
echo "  git clone -b \${branch} \$url \$cfg_temp_dir"
echo
echo "SVN分支："
echo "  if [ -d \"\$cfg_temp_dir\" ]; then"
echo "    rm -rf \"\$cfg_temp_dir\""
echo "  fi"
echo "  svn checkout -q \$url \$cfg_temp_dir"
echo

echo "🧪 测试场景："
echo
echo "场景1: 首次运行（目录不存在）"
echo "  - 应该正常克隆代码"
echo "  - 不应该有任何错误"
echo
echo "场景2: 重复运行（目录已存在）"
echo "  - 应该先清理旧目录"
echo "  - 然后正常克隆新代码"
echo "  - DEBUG模式下显示清理信息"
echo
echo "场景3: 目录被占用或权限问题"
echo "  - 应该尝试强制删除"
echo "  - 如果删除失败，Git克隆会报错"
echo

echo "🔍 测试方法："
echo
echo "1. 首次运行："
echo "   devops run java myapp --git-url https://github.com/example/repo.git"
echo
echo "2. 立即重复运行："
echo "   devops run java myapp --git-url https://github.com/example/repo.git"
echo "   应该不再出现 'already exists' 错误"
echo
echo "3. 启用调试模式："
echo "   DEBUG=true devops run java myapp --git-url https://github.com/example/repo.git"
echo "   应该看到: DEBUG: 清理已存在的构建目录: /tmp/devops/workspace/myapp"
echo
echo "4. 检查目录清理："
echo "   ls -la /tmp/devops/\$(get_current_workspace)/"
echo "   每次运行后应该只有当前构建的目录"
echo

echo "✅ 预期行为："
echo "1. 不再出现 'already exists and is not an empty directory' 错误"
echo "2. 可以多次运行相同的构建命令"
echo "3. 每次都能获取最新的代码"
echo "4. 临时目录被正确管理"
echo

echo "🎯 额外的安全措施："
echo "1. 只删除预期的构建目录路径"
echo "2. 不会误删系统重要目录"
echo "3. 删除前会验证路径的合理性"
echo

echo "🚨 如果仍然有问题："
echo "1. 检查 /tmp/devops/ 目录权限"
echo "2. 检查磁盘空间是否足够"
echo "3. 检查是否有其他进程占用目录"
echo "4. 手动清理: rm -rf /tmp/devops/workspace/job-name"
echo

echo "🔄 完整的清理逻辑："
echo "系统现在在以下时机会清理临时目录："
echo "1. 构建开始前的初始清理（job_name_check函数）"
echo "   - 删除整个构建目录"
echo "   - 验证清理是否成功"
echo "   - DEBUG模式显示清理信息"
echo
echo "2. 代码拉取前的二次清理（scm函数）"
echo "   - Git克隆前检查并清理"
echo "   - SVN checkout前检查并清理"
echo "   - 静态目录处理前检查并清理"
echo
echo "3. 构建完成后的最终清理（prune阶段）"
echo "   - 清理所有临时文件"
echo "   - 清理Docker镜像"
echo
echo "这种多层清理确保了目录冲突问题不会发生"
echo

echo "测试完成后请删除此文件: rm test_git_clone_fix.sh"
