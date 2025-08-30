#!/bin/bash

# DevOps API 快速启动脚本

set -e

echo "🚀 DevOps API 启动脚本"
echo "======================"

# 检查 Node.js 版本
echo "📋 检查系统环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js >= 18.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js 版本过低，当前版本: $NODE_VERSION，要求版本: >= $REQUIRED_VERSION"
    exit 1
fi

echo "✅ Node.js 版本: $NODE_VERSION"

# 检查是否存在 package.json
if [ ! -f "package.json" ]; then
    echo "❌ 未找到 package.json 文件，请确保在正确的目录下运行此脚本"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
if command -v yarn &> /dev/null; then
    echo "使用 yarn 安装依赖..."
    yarn install
else
    echo "使用 npm 安装依赖..."
    npm install
fi

# 创建环境变量文件
if [ ! -f ".env" ]; then
    echo "⚙️  创建环境变量文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
else
    echo "✅ 环境变量文件已存在"
fi

# 创建必要目录
echo "📁 创建必要目录..."
mkdir -p data/workspaces data/templates logs
echo "✅ 目录创建完成"

# 检查端口是否被占用
PORT=${PORT:-8080}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口 $PORT 已被占用，请修改 .env 文件中的 PORT 配置"
    echo "或者杀死占用端口的进程: lsof -ti:$PORT | xargs kill -9"
fi

echo ""
echo "🎉 准备工作完成！"
echo ""
echo "启动命令："
echo "  开发模式: npm run dev"
echo "  生产模式: npm run build && npm start"
echo "  运行测试: npm test"
echo ""
echo "访问地址："
echo "  健康检查: http://localhost:$PORT/health"
echo "  API 文档: http://localhost:$PORT/docs"
echo ""

# 询问是否立即启动
read -p "是否立即启动开发服务器？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 启动开发服务器..."
    if command -v yarn &> /dev/null; then
        yarn dev
    else
        npm run dev
    fi
else
    echo "👋 稍后可以使用 'npm run dev' 启动服务器"
fi
