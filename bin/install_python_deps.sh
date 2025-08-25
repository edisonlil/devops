#!/bin/bash

# 安装Python依赖脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIREMENTS_FILE="$SCRIPT_DIR/requirements.txt"

echo "正在安装Python依赖..."

# 检查Python3是否安装
if ! command -v python3 &> /dev/null; then
    echo "错误: Python3 未安装，请先安装Python3"
    exit 1
fi

# 检查pip3是否安装
if ! command -v pip3 &> /dev/null; then
    echo "错误: pip3 未安装，请先安装pip3"
    exit 1
fi

# 升级pip到最新版本
echo "升级pip到最新版本..."
python3 -m pip install --upgrade pip

# 安装依赖
if [ -f "$REQUIREMENTS_FILE" ]; then
    echo "从 $REQUIREMENTS_FILE 安装依赖..."
    
    # 尝试使用用户安装模式（避免权限问题）
    if pip3 install --user -r "$REQUIREMENTS_FILE"; then
        echo "✅ Python依赖安装成功（用户模式）"
    else
        echo "用户模式安装失败，尝试系统安装..."
        if pip3 install -r "$REQUIREMENTS_FILE"; then
            echo "✅ Python依赖安装成功（系统模式）"
        else
            echo "❌ Python依赖安装失败"
            exit 1
        fi
    fi
else
    echo "警告: requirements.txt 文件不存在，手动安装核心依赖..."
    
    # 尝试使用用户安装模式
    if pip3 install --user PyYAML Jinja2; then
        echo "✅ 核心依赖安装成功（用户模式）"
    else
        echo "用户模式安装失败，尝试系统安装..."
        if pip3 install PyYAML Jinja2; then
            echo "✅ 核心依赖安装成功（系统模式）"
        else
            echo "❌ 核心依赖安装失败"
            exit 1
        fi
    fi
fi

# 验证安装
echo "验证安装..."
if python3 -c "import yaml; import jinja2; print('✅ 所有依赖验证通过')" 2>/dev/null; then
    echo "✅ 依赖验证成功"
else
    echo "❌ 依赖验证失败，尝试重新安装..."
    
    # 如果验证失败，尝试重新安装
    if [ -f "$REQUIREMENTS_FILE" ]; then
        pip3 install --force-reinstall --user -r "$REQUIREMENTS_FILE"
    else
        pip3 install --force-reinstall --user PyYAML Jinja2
    fi
    
    # 再次验证
    if python3 -c "import yaml; import jinja2; print('✅ 重新安装后验证通过')" 2>/dev/null; then
        echo "✅ 重新安装后依赖验证成功"
    else
        echo "❌ 依赖验证最终失败"
        exit 1
    fi
fi

echo "Python依赖安装完成！"
