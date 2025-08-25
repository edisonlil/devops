#!/bin/bash

# 安装测试脚本

echo "🧪 测试DevOps工具链安装..."

# 检查基本命令
echo "检查基本命令..."
if command -v devops &> /dev/null; then
    echo "✅ devops 命令可用"
else
    echo "❌ devops 命令不可用"
    exit 1
fi

# 检查Python环境
echo "检查Python环境..."
if command -v python3 &> /dev/null; then
    echo "✅ python3 可用"
else
    echo "❌ python3 不可用"
    exit 1
fi

# 检查Python依赖
echo "检查Python依赖..."
if python3 -c "import yaml, jinja2" 2>/dev/null; then
    echo "✅ Python依赖已安装"
else
    echo "❌ Python依赖未安装"
    echo "运行: ./bin/install_python_deps.sh"
    exit 1
fi

# 检查Python脚本
echo "检查Python脚本..."
if [ -f "bin/template_renderer.py" ] && [ -f "bin/port_config_handler.py" ]; then
    echo "✅ Python脚本文件存在"
else
    echo "❌ Python脚本文件缺失"
    exit 1
fi

# 测试模板渲染器
echo "测试模板渲染器..."
if python3 -c "import sys; sys.path.insert(0, 'bin'); from template_renderer import TemplateRenderer; print('✅ 模板渲染器测试通过')" 2>/dev/null; then
    echo "✅ 模板渲染器功能正常"
else
    echo "❌ 模板渲染器测试失败"
    exit 1
fi

# 测试端口配置处理器
echo "测试端口配置处理器..."
if python3 -c "import sys; sys.path.insert(0, 'bin'); from port_config_handler import PortConfigHandler; print('✅ 端口配置处理器测试通过')" 2>/dev/null; then
    echo "✅ 端口配置处理器功能正常"
else
    echo "❌ 端口配置处理器测试失败"
    exit 1
fi

# 测试devops命令
echo "测试devops命令..."
if devops --help &> /dev/null; then
    echo "✅ devops命令功能正常"
else
    echo "❌ devops命令测试失败"
    exit 1
fi

echo ""
echo "🎉 所有测试通过！DevOps工具链安装成功！"
echo ""
echo "您现在可以使用以下命令："
echo "  devops --help                    # 查看帮助"
echo "  devops run java --help           # 查看Java部署帮助"
echo "  ./verify_python_deps.sh          # 验证Python依赖"
echo "  python3 test_all_python_components.py  # 运行完整测试"
