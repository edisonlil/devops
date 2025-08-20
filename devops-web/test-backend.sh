#!/bin/bash

# 测试后端服务状态

echo "=== DevOps Web 后端测试 ==="
echo

# 检查端口占用
echo "1. 检查端口3000占用情况:"
if command -v netstat >/dev/null 2>&1; then
    netstat -tlnp | grep :3000 || echo "  端口3000未被占用"
elif command -v ss >/dev/null 2>&1; then
    ss -tlnp | grep :3000 || echo "  端口3000未被占用"
else
    echo "  无法检查端口占用（netstat/ss命令不可用）"
fi

echo

# 检查进程
echo "2. 检查Node.js进程:"
ps aux | grep "node.*app.js" | grep -v grep || echo "  没有找到后端进程"

echo

# 测试连接
echo "3. 测试后端连接:"

# 测试IPv4
echo "  测试 127.0.0.1:3000"
if curl -s -m 5 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "    ✓ IPv4连接成功"
    curl -s http://127.0.0.1:3000/api/health | head -3
else
    echo "    ✗ IPv4连接失败"
fi

echo

# 测试IPv6
echo "  测试 [::1]:3000"
if curl -s -m 5 http://[::1]:3000/api/health >/dev/null 2>&1; then
    echo "    ✓ IPv6连接成功"
else
    echo "    ✗ IPv6连接失败"
fi

echo

# 测试localhost
echo "  测试 localhost:3000"
if curl -s -m 5 http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "    ✓ localhost连接成功"
    echo "    响应内容:"
    curl -s http://localhost:3000/api/health | jq . 2>/dev/null || curl -s http://localhost:3000/api/health
else
    echo "    ✗ localhost连接失败"
fi

echo

# 检查环境变量
echo "4. 检查环境变量:"
echo "  DEVOPS_HOME: ${DEVOPS_HOME:-未设置}"
echo "  NODE_ENV: ${NODE_ENV:-未设置}"
echo "  PORT: ${PORT:-未设置}"

echo

# 检查目录
echo "5. 检查关键目录:"
DEVOPS_PATH="${DEVOPS_HOME:-$HOME/devops}"
WORKSPACE_PATH="$DEVOPS_PATH/workspace"

echo "  DevOps路径: $DEVOPS_PATH"
if [[ -d "$DEVOPS_PATH" ]]; then
    echo "    ✓ DevOps目录存在"
else
    echo "    ✗ DevOps目录不存在"
fi

echo "  工作空间路径: $WORKSPACE_PATH"
if [[ -d "$WORKSPACE_PATH" ]]; then
    echo "    ✓ 工作空间目录存在"
    echo "    工作空间列表:"
    ls -la "$WORKSPACE_PATH" | head -10
else
    echo "    ✗ 工作空间目录不存在"
fi

echo

# 启动建议
echo "6. 启动建议:"
echo "  如果后端未运行，请执行:"
echo "    cd devops-web/backend"
echo "    npm install"
echo "    node app.js"
echo
echo "  或使用启动脚本:"
echo "    cd devops-web"
echo "    ./start.sh dev"

echo
echo "=== 测试完成 ==="
