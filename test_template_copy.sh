#!/bin/bash

# 测试模板文件复制功能
# 这个脚本会被删除，仅用于验证修复

echo "=== 模板文件复制功能测试 ==="
echo

echo "🔧 修复内容："
echo "1. 使用 cp -f 强制覆盖已存在的文件"
echo "2. 添加文件内容比较，避免不必要的覆盖"
echo "3. 提供详细的复制状态日志"
echo "4. 区分新复制、覆盖、跳过的文件"
echo "5. 添加调试信息和错误检查"
echo

echo "🎯 修复的问题："
echo "1. ❌ 原问题: cp 命令不覆盖已存在文件"
echo "   ✅ 修复: 使用 cp -f 强制覆盖"
echo
echo "2. ❌ 原问题: 缺少详细的复制状态信息"
echo "   ✅ 修复: 详细记录新复制、覆盖、跳过的文件"
echo
echo "3. ❌ 原问题: 没有验证复制是否成功"
echo "   ✅ 修复: 检查目标文件是否存在"
echo
echo "4. ❌ 原问题: 重复复制相同内容的文件"
echo "   ✅ 修复: 比较文件内容，相同则跳过"
echo

echo "🧪 测试场景："
echo
echo "场景1: 首次复制模板文件"
echo "  - 应该显示: '复制模板文件到构建上下文: filename'"
echo "  - 应该显示: '新复制 N 个文件'"
echo
echo "场景2: 文件已存在且内容相同"
echo "  - 应该显示: '跳过 N 个文件'（DEBUG模式下）"
echo "  - 不应该重复复制"
echo
echo "场景3: 文件已存在但内容不同"
echo "  - 应该显示: '覆盖模板文件到构建上下文: filename'"
echo "  - 应该显示: '覆盖 N 个文件'"
echo
echo "场景4: 模板目录包含多种文件"
echo "  - 应该跳过: dockerfile, deploy.yaml, deploy.yml, meta.json"
echo "  - 应该复制: 其他所有文件（如配置文件、脚本等）"
echo

echo "🔍 测试方法："
echo
echo "1. 启用调试模式测试："
echo "   DEBUG=true devops run java myapp"
echo
echo "2. 观察日志输出，应该看到："
echo "   DEBUG: 复制模板文件从 /path/to/template 到 /tmp/devops/workspace/myapp"
echo "   复制模板文件到构建上下文: config.properties"
echo "   模板文件处理完成: 新复制 1 个，覆盖 0 个，跳过 0 个"
echo
echo "3. 再次运行相同命令，应该看到："
echo "   DEBUG: 文件内容相同，跳过: config.properties"
echo "   模板文件处理完成: 新复制 0 个，覆盖 0 个，跳过 1 个"
echo
echo "4. 修改模板文件后再次运行，应该看到："
echo "   覆盖模板文件到构建上下文: config.properties"
echo "   模板文件处理完成: 新复制 0 个，覆盖 1 个，跳过 0 个"
echo

echo "📁 检查构建上下文："
echo "构建上下文通常在: /tmp/devops/{workspace}/{job_name}/"
echo "可以检查该目录下是否有模板文件被正确复制"
echo

echo "🎯 预期行为："
echo "✅ 配置文件应该被正确复制到构建上下文"
echo "✅ 已存在的文件应该被覆盖（如果内容不同）"
echo "✅ 相同内容的文件应该被跳过（提高效率）"
echo "✅ 系统文件（dockerfile等）应该被跳过"
echo "✅ 提供清晰的日志信息"
echo

echo "🚨 如果仍然有问题："
echo "1. 检查模板目录是否存在配置文件"
echo "2. 检查构建上下文目录权限"
echo "3. 检查磁盘空间是否足够"
echo "4. 启用DEBUG模式查看详细信息"
echo

echo "测试完成后请删除此文件: rm test_template_copy.sh"
