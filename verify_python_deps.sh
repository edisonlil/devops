#!/bin/bash

# Python依赖验证脚本

echo "🔍 验证Python依赖安装状态..."

# 检查Python3
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version 2>&1)
    echo "✅ Python3 已安装: $python_version"
else
    echo "❌ Python3 未安装"
    exit 1
fi

# 检查pip3
if command -v pip3 &> /dev/null; then
    pip_version=$(pip3 --version 2>&1)
    echo "✅ pip3 已安装: $pip_version"
else
    echo "❌ pip3 未安装"
    exit 1
fi

# 检查PyYAML
if python3 -c "import yaml; print('PyYAML版本:', yaml.__version__)" 2>/dev/null; then
    echo "✅ PyYAML 已安装"
else
    echo "❌ PyYAML 未安装"
    echo "尝试安装 PyYAML..."
    pip3 install --user PyYAML
    if python3 -c "import yaml" 2>/dev/null; then
        echo "✅ PyYAML 安装成功"
    else
        echo "❌ PyYAML 安装失败"
        exit 1
    fi
fi

# 检查Jinja2
if python3 -c "import jinja2; print('Jinja2版本:', jinja2.__version__)" 2>/dev/null; then
    echo "✅ Jinja2 已安装"
else
    echo "❌ Jinja2 未安装"
    echo "尝试安装 Jinja2..."
    pip3 install --user Jinja2
    if python3 -c "import jinja2" 2>/dev/null; then
        echo "✅ Jinja2 安装成功"
    else
        echo "❌ Jinja2 安装失败"
        exit 1
    fi
fi

# 测试Python脚本
echo "🧪 测试Python脚本功能..."

# 测试模板渲染器
if [ -f "bin/template_renderer.py" ]; then
    if python3 -c "import sys; sys.path.insert(0, 'bin'); from template_renderer import TemplateRenderer; print('✅ 模板渲染器导入成功')" 2>/dev/null; then
        echo "✅ 模板渲染器功能正常"
    else
        echo "❌ 模板渲染器导入失败"
    fi
else
    echo "⚠️  模板渲染器文件不存在"
fi

# 测试端口配置处理器
if [ -f "bin/port_config_handler.py" ]; then
    if python3 -c "import sys; sys.path.insert(0, 'bin'); from port_config_handler import PortConfigHandler; print('✅ 端口配置处理器导入成功')" 2>/dev/null; then
        echo "✅ 端口配置处理器功能正常"
    else
        echo "❌ 端口配置处理器导入失败"
    fi
else
    echo "⚠️  端口配置处理器文件不存在"
fi

# 测试高级模板渲染器
if [ -f "bin/advanced_template_renderer.py" ]; then
    if python3 -c "import sys; sys.path.insert(0, 'bin'); from advanced_template_renderer import AdvancedTemplateRenderer; print('✅ 高级模板渲染器导入成功')" 2>/dev/null; then
        echo "✅ 高级模板渲染器功能正常"
    else
        echo "❌ 高级模板渲染器导入失败"
    fi
else
    echo "⚠️  高级模板渲染器文件不存在"
fi

echo ""
echo "🎉 Python依赖验证完成！"
echo ""
echo "如果所有检查都通过，您的Python环境已准备就绪。"
echo "如果发现问题，请运行以下命令重新安装依赖："
echo "  ./bin/install_python_deps.sh"
