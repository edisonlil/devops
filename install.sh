#!/bin/bash

# DevOps 一键安装脚本
# 作者: edison, srillia
# 版本: 1.0.0

# 错误处理
set -e
set -o pipefail

# 错误处理函数
error_exit() {
    echo "错误: $1" >&2
    exit 1
}

# 捕获错误
trap 'error_exit "脚本在第 $LINENO 行执行失败"' ERR

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warn "检测到以root用户运行，建议使用普通用户运行此脚本"
        # 检查是否在交互式终端中
        if [[ -t 0 ]]; then
            read -p "是否继续 (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        else
            log_info "非交互式模式，自动继续安装"
        fi
    fi
}

# 检测操作系统
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    elif [[ -f /etc/redhat-release ]]; then
        OS="Red Hat Enterprise Linux"
        VER=$(cat /etc/redhat-release | sed 's/.*release \([0-9.]*\).*/\1/')
    else
        OS=$(uname -s)
        VER=$(uname -r)
    fi
    
    log_info "检测到操作系统: $OS $VER"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查当前目录是否为DevOps项目
is_devops_project() {
    local current_dir="$(pwd)"

    # 检查关键文件和目录是否存在
    if [[ -f "install.sh" ]] && \
       [[ -d "bin" ]] && \
       [[ -f "bin/devops" ]] && \
       [[ -d "workspace" ]] && \
       [[ -f "README.md" ]]; then
        return 0
    else
        return 1
    fi
}

# 安装包管理器相关函数
install_package() {
    local package=$1
    
    if command_exists apt-get; then
        sudo apt-get update && sudo apt-get install -y $package
    elif command_exists yum; then
        sudo yum install -y $package
    elif command_exists dnf; then
        sudo dnf install -y $package
    elif command_exists pacman; then
        sudo pacman -S --noconfirm $package
    else
        log_error "不支持的包管理器，请手动安装 $package"
        return 1
    fi
}

# 检查并安装基础工具
install_basic_tools() {
    log_step "检查并安装基础工具..."
    
    local tools=("curl" "wget" "git" "unzip" "expect")
    
    for tool in "${tools[@]}"; do
        if ! command_exists $tool; then
            log_info "安装 $tool..."
            install_package $tool
        else
            log_info "$tool 已安装"
        fi
    done
}

# 安装 Docker
install_docker() {
    log_step "检查并安装 Docker..."
    
    if command_exists docker; then
        log_info "Docker 已安装"
        docker --version
        return 0
    fi
    
    log_info "安装 Docker..."
    
    # 使用官方安装脚本
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    
    # 将当前用户添加到docker组
    sudo usermod -aG docker $USER
    
    # 启动Docker服务
    sudo systemctl enable docker
    sudo systemctl start docker
    
    log_info "Docker 安装完成"
    rm -f get-docker.sh
}

# 安装 SDKMAN!
install_sdkman() {
    log_step "检查并安装 SDKMAN!..."

    if [[ -d "$HOME/.sdkman" ]]; then
        log_info "SDKMAN! 已安装"
        return 0
    fi

    log_info "安装 SDKMAN!..."
    curl -s "https://get.sdkman.io" | bash

    # 初始化 SDKMAN!
    source "$HOME/.sdkman/bin/sdkman-init.sh"

    log_info "SDKMAN! 安装完成"
}

# 安装 Java (使用 SDKMAN!)
install_java() {
    log_step "检查并安装 Java..."

    # 先安装 SDKMAN!
    install_sdkman

    # 初始化 SDKMAN! 环境
    if [[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]]; then
        source "$HOME/.sdkman/bin/sdkman-init.sh"
    fi

    if command_exists java; then
        log_info "Java 已安装"
        java -version
        return 0
    fi

    log_info "使用 SDKMAN! 安装 Java 8..."

    # 安装 Java 8 (Temurin 发行版)
    sdk install java 8.0.392-tem
    sdk default java 8.0.392-tem

    log_info "Java 安装完成"
}

# 安装 Maven (使用 SDKMAN!)
install_maven() {
    log_step "检查并安装 Maven..."

    # 确保 SDKMAN! 已安装
    install_sdkman

    # 初始化 SDKMAN! 环境
    if [[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]]; then
        source "$HOME/.sdkman/bin/sdkman-init.sh"
    fi

    if command_exists mvn; then
        log_info "Maven 已安装"
        mvn -version
        return 0
    fi

    log_info "使用 SDKMAN! 安装 Maven..."

    # 安装最新版本的 Maven
    sdk install maven

    log_info "Maven 安装完成"
}

# 安装 Gradle (使用 SDKMAN!)
install_gradle() {
    log_step "检查并安装 Gradle..."

    # 确保 SDKMAN! 已安装
    install_sdkman

    # 初始化 SDKMAN! 环境
    if [[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]]; then
        source "$HOME/.sdkman/bin/sdkman-init.sh"
    fi

    if command_exists gradle; then
        log_info "Gradle 已安装"
        gradle -version
        return 0
    fi

    log_info "使用 SDKMAN! 安装 Gradle..."

    # 安装最新版本的 Gradle
    sdk install gradle

    log_info "Gradle 安装完成"
}

# 安装 Node.js
install_nodejs() {
    log_step "检查并安装 Node.js..."
    
    if command_exists node; then
        log_info "Node.js 已安装"
        node --version
        npm --version
        return 0
    fi
    
    log_info "安装 Node.js..."
    
    # 使用 NodeSource 仓库安装最新 LTS 版本
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    log_info "Node.js 安装完成"
}

# 安装 Go
install_go() {
    log_step "检查并安装 Go..."
    
    if command_exists go; then
        log_info "Go 已安装"
        go version
        return 0
    fi
    
    log_info "安装 Go..."
    
    local go_version="1.21.4"
    local go_url="https://golang.org/dl/go${go_version}.linux-amd64.tar.gz"
    
    cd /tmp
    wget $go_url
    sudo tar -C /usr/local -xzf go${go_version}.linux-amd64.tar.gz
    
    # 添加到PATH
    echo 'export PATH=$PATH:/usr/local/go/bin' | sudo tee -a /etc/profile
    
    rm -f go${go_version}.linux-amd64.tar.gz
    
    log_info "Go 安装完成"
}

# 配置环境变量
setup_environment() {
    log_step "配置 DevOps 环境变量..."

    local devops_home="$HOME/devops"

    # 创建环境变量配置
    cat > /tmp/devops_env.sh << EOF
# DevOps Environment Variables
export DEVOPS_HOME=$devops_home
export PATH=\$PATH:\$DEVOPS_HOME/bin
EOF

    # 添加到系统环境变量（如果有权限）
    if sudo -n true 2>/dev/null; then
        sudo cp /tmp/devops_env.sh /etc/profile.d/devops.sh
        sudo chmod +x /etc/profile.d/devops.sh
        log_info "系统环境变量配置完成"
    else
        log_warn "无sudo权限，跳过系统环境变量配置"
    fi

    # 添加到用户的 .bashrc
    if ! grep -q "DEVOPS_HOME" ~/.bashrc 2>/dev/null; then
        cat >> ~/.bashrc << EOF

# DevOps Environment Variables
export DEVOPS_HOME=$devops_home
export PATH=\$PATH:\$DEVOPS_HOME/bin

# DevOps Command Auto-completion
if [[ -f "\$DEVOPS_HOME/bin/devops-completion.bash" ]]; then
    source "\$DEVOPS_HOME/bin/devops-completion.bash"
fi
EOF
        log_info "用户环境变量配置完成"
    else
        log_info "用户环境变量已存在"
        # 检查是否已有自动补全配置
        if ! grep -q "devops-completion.bash" ~/.bashrc 2>/dev/null; then
            cat >> ~/.bashrc << EOF

# DevOps Command Auto-completion
if [[ -f "\$DEVOPS_HOME/bin/devops-completion.bash" ]]; then
    source "\$DEVOPS_HOME/bin/devops-completion.bash"
fi
EOF
            log_info "自动补全配置已添加"
        else
            log_info "自动补全配置已存在"
        fi
    fi

    # 清理临时文件
    rm -f /tmp/devops_env.sh

    log_info "环境变量配置完成"
}

# 安装Python依赖
install_python_deps() {
    log_step "安装Python依赖..."

    local devops_home="$HOME/devops"
    local python_deps_script="$devops_home/bin/install_python_deps.sh"

    # 检查Python3是否安装
    if ! command_exists python3; then
        log_warn "Python3 未安装，尝试安装..."
        if command_exists apt-get; then
            sudo apt-get update && sudo apt-get install -y python3 python3-pip
        elif command_exists yum; then
            sudo yum install -y python3 python3-pip
        elif command_exists dnf; then
            sudo dnf install -y python3 python3-pip
        else
            log_error "无法自动安装Python3，请手动安装后重新运行安装脚本"
            return 1
        fi
    fi

    # 检查pip3是否安装
    if ! command_exists pip3; then
        log_warn "pip3 未安装，尝试安装..."
        if command_exists apt-get; then
            sudo apt-get update && sudo apt-get install -y python3-pip
        elif command_exists yum; then
            sudo yum install -y python3-pip
        elif command_exists dnf; then
            sudo dnf install -y python3-pip
        else
            log_error "无法自动安装pip3，请手动安装后重新运行安装脚本"
            return 1
        fi
    fi

    # 运行Python依赖安装脚本
    if [[ -f "$python_deps_script" ]]; then
        log_info "运行Python依赖安装脚本..."
        if bash "$python_deps_script"; then
            log_info "Python依赖安装成功"
        else
            log_error "Python依赖安装失败"
            return 1
        fi
    else
        log_warn "Python依赖安装脚本不存在，手动安装核心依赖..."
        if pip3 install PyYAML Jinja2; then
            log_info "核心Python依赖安装成功"
        else
            log_error "核心Python依赖安装失败"
            return 1
        fi
    fi

    # 验证Python依赖
    log_info "验证Python依赖..."
    if python3 -c "import yaml; import jinja2; print('Python依赖验证通过')" 2>/dev/null; then
        log_info "Python依赖验证成功"
    else
        log_error "Python依赖验证失败"
        return 1
    fi
}

# 创建必要的目录和文件
setup_directories() {
    log_step "创建必要的目录结构..."

    local devops_home="$HOME/devops"

    # 创建用户配置目录
    mkdir -p $HOME/.devops
    mkdir -p $HOME/.deploy

    # 复制示例配置文件
    if [[ -f "$devops_home/workspace/deploy-target.sample" ]]; then
        cp "$devops_home/workspace/deploy-target.sample" $HOME/.deploy/deploy-target.sample
        log_info "示例配置文件已复制到 $HOME/.deploy/"
    else
        log_warn "示例配置文件不存在，跳过复制"
    fi

    # 设置执行权限
    if [[ -d "$devops_home/bin" ]]; then
        chmod +x "$devops_home/bin"/* 2>/dev/null || true
        log_info "设置脚本执行权限"
    else
        log_warn "bin目录不存在，跳过权限设置"
    fi

    log_info "目录结构创建完成"
}

# 验证安装
verify_installation() {
    log_step "验证安装..."

    local devops_home="$HOME/devops"
    local errors=0

    # 检查关键文件
    local required_files=(
        "$devops_home/bin/devops"
        "$devops_home/bin/log.sh"
        "$devops_home/bin/tools.sh"
        "$devops_home/bin/env.sh"
        "$devops_home/bin/build.sh"
        "$devops_home/bin/install_tools.sh"
        "$devops_home/bin/devops-completion.bash"
    )

    for file in "${required_files[@]}"; do
        if [[ -f "$file" ]]; then
            log_info "$file"
        else
            log_error "$file (缺失)"
            ((errors++))
        fi
    done

    # 检查执行权限
    if [[ -x "$devops_home/bin/devops" ]]; then
        log_info "devops 脚本有执行权限"
    else
        log_error "devops 脚本没有执行权限"
        ((errors++))
    fi

    # 检查环境变量
    if grep -q "DEVOPS_HOME" ~/.bashrc 2>/dev/null; then
        log_info "环境变量已配置"
    else
        log_error "环境变量未配置"
        ((errors++))
    fi

    if [[ $errors -eq 0 ]]; then
        log_info "安装验证通过"
        return 0
    else
        log_error "安装验证失败，发现 $errors 个问题"
        return 1
    fi
}

# 验证安装
verify_installation() {
    log_step "验证安装..."
    
    local errors=0
    
    # 检查必要的命令
    local commands=("docker" "git" "java" "mvn" "gradle" "node" "npm")
    
    for cmd in "${commands[@]}"; do
        if command_exists $cmd; then
            log_info "$cmd 可用"
        else
            log_error "$cmd 不可用"
            ((errors++))
        fi
    done
    
    # 检查devops 命令
    if [[ -x "bin/devops" ]]; then
        log_info "devops 命令可用"
    else
        log_error "devops 命令不可用"
        ((errors++))
    fi
    
    if [[ $errors -eq 0 ]]; then
        log_info "所有组件验证通过"
        return 0
    else
        log_error "发现 $errors 个问题，请检查安装日志"
        return 1
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
DevOps 一键安装脚本

用法: $0 [选项]

选项:
  --full                      完整安装，包含所有开发环境和工具
  --minimal, --script-only    脚本专用安装，仅安装 DevOps 脚本和基础工具
  --offline                   离线安装，使用当前目录的代码（适用于已上传代码到服务器的情况）
                              自动修复Windows换行符问题
  --help, -h                  显示此帮助信息

安装模式:
  默认模式: 标准安装 - Java + Docker + Maven + Gradle (~10分钟)
  完整模式: 完整安装 - 标准 + Node.js + Go (~20分钟)
  脚本模式: 脚本专用 - 仅脚本工具(~1分钟)
  离线模式: 使用本地代码安装 - 适用于已上传代码的情况(~5分钟)
            自动修复Windows/Linux换行符兼容性问题

示例:
  $0                    # 标准安装
  $0 --full             # 完整安装
  $0 --script-only      # 脚本专用安装
  $0 --offline          # 离线安装（使用当前目录代码）

EOF
}

# 显示使用说明
show_usage() {
    log_step "安装完成"

    cat << EOF

${GREEN}DevOps 工具安装成功 {NC}

${YELLOW}使用说明:${NC}
1. 重新加载环境变量: source ~/.bashrc
2. 或者重新登录终端
3. 使用Tab键自动补全devops命令

${YELLOW}环境工具安装:${NC}
# 检查当前环境
devops install-tools --check

# 交互式安装缺失工具
devops install-tools

# 安装指定工具
devops install-tools --tools docker,kubectl,java

${YELLOW}Tab自动补全:${NC}
# 显示主命令
devops <Tab>                    # 输出: run install-tools template

# 显示项目类型
devops run <Tab>                # 输出: java vue golang tomcat

# 显示所有选项
devops run java --<Tab>         # 显示所有可用选项

${YELLOW}示例命令:${NC}
# Java 项目构建
devops run java --git-url https://github.com/example/project.git --build-tool maven my-project

# Vue 项目构建
devops run vue --git-url https://github.com/example/vue-project.git --dockerfile node my-vue-app

${YELLOW}配置文件:${NC}
- 工作空间配置: workspace/enable
- 部署目标配置: $HOME/.deploy/deploy-target.sample (复制并重命名deploy-target)

${YELLOW}更多帮助:${NC}
devops -h
devops install-tools --help

EOF
}

# 下载DevOps项目
download_devops_project() {
    log_step "下载 DevOps 项目..."

    local devops_dir="$HOME/devops"
    local github_url="https://github.com/edisonlil/devops"
    local branch="dev"

    # 如果目录已存在，先备份
    if [[ -d "$devops_dir" ]]; then
        log_warn "DevOps 目录已存在，创建备份..."
        mv "$devops_dir" "${devops_dir}.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    # 尝试使用git克隆
    if command_exists git; then
        log_info "使用 git 克隆项目..."
        if git clone -b "$branch" "$github_url" "$devops_dir"; then
            log_info "git 克隆成功"
            return 0
        else
            log_warn "git 克隆失败，尝试HTTP下载"
            rm -rf "$devops_dir" 2>/dev/null || true
        fi
    fi

    # 使用HTTP下载
    log_info "使用 HTTP 下载项目..."
    local zip_url="${github_url}/archive/refs/heads/${branch}.zip"
    local temp_dir="/tmp/devops_install_$$"

    mkdir -p "$temp_dir"
    cd "$temp_dir"

    # 下载
    if command_exists curl; then
        log_info "使用 curl 下载..."
        curl -fsSL -o devops.zip "$zip_url"
    elif command_exists wget; then
        log_info "使用 wget 下载..."
        wget -O devops.zip "$zip_url"
    else
        log_error "curl wget 都不可用用"
        exit 1
    fi

    # 解压
    log_info "解压文件..."
    if ! unzip -q devops.zip; then
        log_error "解压失败"
        exit 1
    fi

    # 移动
    log_info "安装到目标目录..."
    if ! mv "devops-${branch}" "$devops_dir"; then
        log_error "移动文件失败"
        exit 1
    fi

    # 清理
    cd - > /dev/null
    rm -rf "$temp_dir"

    if [[ ! -d "$devops_dir" ]]; then
        log_error "下载 DevOps 项目失败"
        exit 1
    fi

    log_info "DevOps 项目下载完成: $devops_dir"
}

# 修复换行符问题
fix_line_endings() {
    local target_dir="$1"
    log_step "修复文件换行符格式..."

    # 检查是否有 dos2unix 命令
    if command_exists dos2unix; then
        log_info "使用 dos2unix 修复换行符..."
        find "$target_dir" -type f \( -name "*.sh" -o -name "*.conf" -o -name "config" -o -name "devops*" -o -name "*.py" -o -name "*.yml" -o -name "*.yaml" -o -name "*.md" -o -name "*.txt" \) -exec dos2unix {} \; 2>/dev/null || true
    else
        log_info "使用 sed 修复换行符..."
        find "$target_dir" -type f \( -name "*.sh" -o -name "*.conf" -o -name "config" -o -name "devops*" -o -name "*.py" -o -name "*.yml" -o -name "*.yaml" -o -name "*.md" -o -name "*.txt" \) -exec sed -i 's/\r$//' {} \; 2>/dev/null || true
    fi

    # 确保脚本有执行权限
    chmod +x "$target_dir/bin/"* 2>/dev/null || true
    chmod +x "$target_dir/install.sh" 2>/dev/null || true

    log_info "换行符格式修复完成"
}

# 离线安装（使用当前目录的代码）
offline_install() {
    log_info "离线安装模式 - 使用当前目录的代码"

    # 检查当前目录是否为DevOps项目
    if ! is_devops_project; then
        log_error "当前目录不是有效的DevOps项目目录"
        log_error "请确保您在DevOps项目根目录下运行此脚本"
        log_error "或者使用在线安装模式: $0"
        exit 1
    fi

    local current_dir="$(pwd)"
    local devops_home="$HOME/devops"

    log_info "检测到有效的DevOps项目: $current_dir"

    check_root
    detect_os

    # 安装基础工具
    install_basic_tools

    # 如果目标目录已存在，先备份
    if [[ -d "$devops_home" ]] && [[ "$current_dir" != "$devops_home" ]]; then
        log_warn "目标目录已存在，创建备份..."
        mv "$devops_home" "${devops_home}.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    # 如果当前目录不是目标目录，则复制文件
    if [[ "$current_dir" != "$devops_home" ]]; then
        log_step "复制项目文件$devops_home..."
        mkdir -p "$(dirname "$devops_home")"
        cp -r "$current_dir" "$devops_home"
        log_info "项目文件复制完成"
    else
        log_info "已在目标目录中，跳过文件复制"
    fi

    # 切换到目标目录
    cd "$devops_home"

    # 修复换行符问题（重要：防止Windows换行符导致的脚本执行问题）
    fix_line_endings "$devops_home"

    setup_environment
    setup_directories
    install_python_deps

    # 验证安装
    if verify_installation; then
        log_info "离线安装完成"
        log_info "DevOps 脚本已安装到: $devops_home"
        show_usage
        log_info "DevOps 脚本已就绪，可以开始使用"
        log_warn "注意: 仅安装了DevOps脚本，使用'devops install-tools' 安装开发环境工具"
    else
        log_error "安装验证失败，请检查安装过程"
        exit 1
    fi
}

# 最小化安装（仅安装 DevOps 脚本）
minimal_install() {
    log_info "最小化安装模式 - 仅安装DevOps 脚本"

    check_root
    detect_os

    # 只安装必要的基础工具
    log_step "安装基础工具..."
    local basic_tools=("curl" "wget" "git" "unzip")

    for tool in "${basic_tools[@]}"; do
        if ! command_exists $tool; then
            log_info "安装 $tool..."
            install_package $tool
        else
            log_info "$tool 已安装"
        fi
    done

    # 下载DevOps项目
    download_devops_project

    # 切换到项目目录
    cd "$HOME/devops"

    setup_environment
    setup_directories
    install_python_deps

    # 验证安装
    if verify_installation; then
        log_info "最小化安装完成"
        log_info "DevOps 脚本已安装到: $HOME/devops"
        show_usage
        log_info "DevOps 脚本已就绪，可以开始使用"
        log_warn "注意: 未安装开发环境，使用 'devops install-tools' 安装所需工具"
    else
        log_error "安装验证失败，请检查安装过程"
        exit 1
    fi
}

# 主函数
main() {
    case "${1:-}" in
        --minimal|--script-only)
            log_info "开始 DevOps 脚本专用安装..."
            minimal_install
            ;;
        --offline)
            log_info "开始 DevOps 离线安装..."
            offline_install
            ;;
        --full)
            log_info "开始 DevOps 完整安装（所有组件）..."

            check_root
            detect_os

            # 检查是否为离线模式（当前目录是DevOps项目)
            if is_devops_project; then
                log_info "检测到当前目录为DevOps项目，使用离线模式"
                # 复制到目标目录
                local devops_home="$HOME/devops"
                local current_dir="$(pwd)"

                if [[ "$current_dir" != "$devops_home" ]]; then
                    if [[ -d "$devops_home" ]]; then
                        log_warn "目标目录已存在，创建备份..."
                        mv "$devops_home" "${devops_home}.backup.$(date +%Y%m%d_%H%M%S)"
                    fi
                    log_step "复制项目文件 $devops_home..."
                    mkdir -p "$(dirname "$devops_home")"
                    cp -r "$current_dir" "$devops_home"
                    cd "$devops_home"
                fi

                # 修复换行符问题（离线模式）
                fix_line_endings "$devops_home"
            else
                # 在线下载
                download_devops_project
                cd "$HOME/devops"
            fi

            install_basic_tools
            install_docker
            install_java
            install_maven
            install_gradle
            install_nodejs
            install_go

            setup_environment
            setup_directories
            install_python_deps

            if verify_installation; then
                show_usage
                log_info "完整安装完成！请重新加载环境变量或重新登录终端"
            else
                log_error "安装过程中出现问题，请检查错误信息"
                exit 1
            fi
            ;;
        --help|-h)
            show_help
            ;;
        *)
            log_info "开始DevOps 标准安装..."

            check_root
            detect_os

            # 检查是否为离线模式（当前目录是DevOps项目)
            if is_devops_project; then
                log_info "检测到当前目录为DevOps项目，使用离线模式"
                # 复制到目标目录
                local devops_home="$HOME/devops"
                local current_dir="$(pwd)"

                if [[ "$current_dir" != "$devops_home" ]]; then
                    if [[ -d "$devops_home" ]]; then
                        log_warn "目标目录已存在，创建备份..."
                        mv "$devops_home" "${devops_home}.backup.$(date +%Y%m%d_%H%M%S)"
                    fi
                    log_step "复制项目文件 $devops_home..."
                    mkdir -p "$(dirname "$devops_home")"
                    cp -r "$current_dir" "$devops_home"
                    cd "$devops_home"
                fi

                # 修复换行符问题（离线模式）
                fix_line_endings "$devops_home"
            else
                # 在线下载
                download_devops_project
                cd "$HOME/devops"
            fi

            install_basic_tools
            install_docker
            install_java
            install_maven
            install_gradle
            # 标准安装不包含Node.js Go

            setup_environment
            setup_directories
            install_python_deps

            if verify_installation; then
                show_usage
                log_info "标准安装完成！请重新加载环境变量或重新登录终端"
            else
                log_error "安装过程中出现问题，请检查错误信息"
                exit 1
            fi
            ;;
    esac
}

# 脚本入口
# 支持通过curl管道执行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]] || [[ "${BASH_SOURCE[0]}" == "bash" ]] || [[ -z "${BASH_SOURCE[0]}" ]]; then
    main "$@"
fi




