#!/bin/bash

# DevOps 安装验证脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== DevOps 安装验证 ===${NC}"
echo

# 检查项目目录
echo -e "${YELLOW}1. 检查项目目录...${NC}"
if [[ -d "$HOME/devops" ]]; then
    echo -e "  ${GREEN}✓${NC} DevOps 项目目录存在: $HOME/devops"
else
    echo -e "  ${RED}✗${NC} DevOps 项目目录不存在"
    exit 1
fi

# 检查主要脚本文件
echo -e "${YELLOW}2. 检查主要脚本文件...${NC}"
REQUIRED_FILES=(
    "bin/devops"
    "bin/install_tools.sh"
    "bin/tools.sh"
    "bin/env.sh"
    "bin/build.sh"
    "bin/log.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$HOME/devops/$file" ]]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file"
    fi
done

# 检查执行权限
echo -e "${YELLOW}3. 检查执行权限...${NC}"
if [[ -x "$HOME/devops/bin/devops" ]]; then
    echo -e "  ${GREEN}✓${NC} devops 脚本有执行权限"
else
    echo -e "  ${RED}✗${NC} devops 脚本没有执行权限"
fi

# 检查环境变量
echo -e "${YELLOW}4. 检查环境变量...${NC}"
if [[ -n "$DEVOPS_HOME" ]]; then
    echo -e "  ${GREEN}✓${NC} DEVOPS_HOME 已设置: $DEVOPS_HOME"
else
    echo -e "  ${YELLOW}!${NC} DEVOPS_HOME 未设置，请运行: source ~/.bashrc"
fi

# 检查PATH
if echo "$PATH" | grep -q "devops/bin"; then
    echo -e "  ${GREEN}✓${NC} DevOps bin 目录已添加到 PATH"
else
    echo -e "  ${YELLOW}!${NC} DevOps bin 目录未添加到 PATH，请运行: source ~/.bashrc"
fi

# 检查devops命令
echo -e "${YELLOW}5. 检查devops命令...${NC}"
if command -v devops >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} devops 命令可用"
    
    # 测试help命令
    if devops -h >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} devops -h 命令正常"
    else
        echo -e "  ${RED}✗${NC} devops -h 命令失败"
    fi
    
    # 测试install-tools命令
    if devops install-tools --help >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} devops install-tools 命令正常"
    else
        echo -e "  ${RED}✗${NC} devops install-tools 命令失败"
    fi
else
    echo -e "  ${RED}✗${NC} devops 命令不可用"
    echo -e "    请检查环境变量设置或运行: source ~/.bashrc"
fi

# 检查配置目录
echo -e "${YELLOW}6. 检查配置目录...${NC}"
if [[ -d "$HOME/.devops" ]]; then
    echo -e "  ${GREEN}✓${NC} ~/.devops 目录存在"
else
    echo -e "  ${RED}✗${NC} ~/.devops 目录不存在"
fi

if [[ -d "$HOME/.deploy" ]]; then
    echo -e "  ${GREEN}✓${NC} ~/.deploy 目录存在"
else
    echo -e "  ${RED}✗${NC} ~/.deploy 目录不存在"
fi

# 检查工作空间
echo -e "${YELLOW}7. 检查工作空间...${NC}"
if [[ -d "$HOME/devops/workspace" ]]; then
    echo -e "  ${GREEN}✓${NC} workspace 目录存在"
    
    if [[ -f "$HOME/devops/workspace/enable" ]]; then
        echo -e "  ${GREEN}✓${NC} workspace/enable 文件存在"
    else
        echo -e "  ${RED}✗${NC} workspace/enable 文件不存在"
    fi
else
    echo -e "  ${RED}✗${NC} workspace 目录不存在"
fi

echo
echo -e "${BLUE}=== 验证完成 ===${NC}"
echo

# 提供下一步建议
echo -e "${YELLOW}下一步建议:${NC}"
echo "1. 如果环境变量未设置，请运行: source ~/.bashrc"
echo "2. 检查开发环境: devops install-tools --check"
echo "3. 安装开发工具: devops install-tools"
echo "4. 查看使用帮助: devops -h"
echo

# 快速测试命令
echo -e "${YELLOW}快速测试命令:${NC}"
echo "# 重新加载环境变量"
echo "source ~/.bashrc"
echo
echo "# 检查环境状态"
echo "devops install-tools --check"
echo
echo "# 交互式安装工具"
echo "devops install-tools"
echo
