#!/bin/bash

# DevOps Web 后端启动脚本

echo "=== DevOps Web 后端启动 ==="
echo

# 检查Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "错误: Node.js 未安装"
    exit 1
fi

echo "Node.js版本: $(node --version)"
echo "NPM版本: $(npm --version)"
echo

# 检查当前目录
if [[ ! -f "app.js" ]]; then
    echo "错误: 请在backend目录中运行此脚本"
    exit 1
fi

# 检查依赖
if [[ ! -d "node_modules" ]]; then
    echo "安装依赖..."
    npm install
    echo
fi

# 设置环境变量
export NODE_ENV=development
export PORT=3000
export HOST=0.0.0.0

# 检查DevOps环境
if [[ -z "$DEVOPS_HOME" ]]; then
    echo "警告: DEVOPS_HOME 环境变量未设置"
    export DEVOPS_HOME="$HOME/devops"
    echo "使用默认路径: $DEVOPS_HOME"
fi

echo "环境变量:"
echo "  DEVOPS_HOME: $DEVOPS_HOME"
echo "  NODE_ENV: $NODE_ENV"
echo "  PORT: $PORT"
echo "  HOST: $HOST"
echo

# 检查DevOps目录
if [[ ! -d "$DEVOPS_HOME" ]]; then
    echo "错误: DevOps目录不存在: $DEVOPS_HOME"
    echo "请先安装DevOps工具或设置正确的DEVOPS_HOME环境变量"
    exit 1
fi

# 确保workspace目录存在
WORKSPACE_PATH="$DEVOPS_HOME/workspace"
if [[ ! -d "$WORKSPACE_PATH" ]]; then
    echo "创建workspace目录: $WORKSPACE_PATH"
    mkdir -p "$WORKSPACE_PATH"
fi

echo "DevOps路径: $DEVOPS_HOME"
echo "工作空间路径: $WORKSPACE_PATH"
echo

# 检查端口占用
if command -v netstat >/dev/null 2>&1; then
    if netstat -tlnp 2>/dev/null | grep -q ":$PORT "; then
        echo "警告: 端口 $PORT 已被占用"
        echo "正在使用端口的进程:"
        netstat -tlnp 2>/dev/null | grep ":$PORT "
        echo
        read -p "是否继续启动? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

echo "启动DevOps Web后端服务器..."
echo "访问地址:"
echo "  本地: http://localhost:$PORT"
echo "  网络: http://$(hostname -I | awk '{print $1}'):$PORT"
echo
echo "按 Ctrl+C 停止服务"
echo "=========================="
echo

# 启动服务器
node app.js
