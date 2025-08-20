#!/bin/bash

# DevOps 环境工具安装脚本
# 提供交互式和批量安装开发环境所需的工具

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 支持的工具列表
SUPPORTED_TOOLS=(
    "git"
    "curl" 
    "wget"
    "unzip"
    "docker"
    "docker-compose"
    "kubectl"
    "helm"
    "java"
    "maven"
    "gradle"
    "node"
    "npm"
    "yarn"
    "go"
    "expect"
)

# 工具分类
BASIC_TOOLS=("git" "curl" "wget" "unzip")
CONTAINER_TOOLS=("docker" "docker-compose")
KUBERNETES_TOOLS=("kubectl" "helm")
JAVA_TOOLS=("java" "maven" "gradle")
NODEJS_TOOLS=("node" "npm" "yarn")
OTHER_TOOLS=("go" "expect")

# 主入口函数
function install_tools() {
    info "DevOps 环境工具安装器"
    
    # 检查参数
    if [[ "${env[opt_install_help]}" == "true" ]]; then
        show_install_help
        return 0
    fi
    
    if [[ "${env[opt_install_check]}" == "true" ]]; then
        check_environment
        return 0
    fi
    
    if [[ "${env[opt_install_all]}" == "true" ]]; then
        install_all_tools
        return 0
    fi
    
    if [[ -n "${env[opt_install_tools]}" ]]; then
        install_specific_tools "${env[opt_install_tools]}"
        return 0
    fi
    
    # 默认交互式安装
    interactive_install
}

# 显示帮助信息
function show_install_help() {
    cat << EOF
${BLUE}DevOps 环境工具安装器${NC}

${YELLOW}用法:${NC}
  devops install-tools [选项]

${YELLOW}选项:${NC}
  --check                     仅检查环境，不安装任何工具
  --all                       安装所有支持的工具
  --tools <tool1,tool2,...>   安装指定的工具（逗号分隔）
  --java-version <version>    指定Java版本 (8, 11, 17, 21)，默认为8
  --help                      显示此帮助信息

${YELLOW}支持的工具:${NC}
  基础工具: git, curl, wget, unzip
  容器工具: docker, docker-compose
  K8s工具:  kubectl, helm
  Java工具: java, maven, gradle
  Node工具: node, npm, yarn
  其他工具: go, expect

${YELLOW}示例:${NC}
  devops install-tools                           # 交互式安装
  devops install-tools --check                   # 检查环境
  devops install-tools --all                     # 安装所有工具
  devops install-tools --tools docker,kubectl    # 安装指定工具
  devops install-tools --tools java --java-version 11  # 安装Java 11

EOF
}

# 检查环境状态
function check_environment() {
    info "检查当前环境状态..."
    echo
    
    local missing_tools=()
    local installed_tools=()
    
    for tool in "${SUPPORTED_TOOLS[@]}"; do
        if check_tool_installed "$tool"; then
            echo -e "  ${GREEN}✓${NC} $tool"
            installed_tools+=("$tool")
        else
            echo -e "  ${RED}✗${NC} $tool"
            missing_tools+=("$tool")
        fi
    done
    
    echo
    info "环境检查完成"
    echo -e "  已安装: ${GREEN}${#installed_tools[@]}${NC} 个工具"
    echo -e "  缺失:   ${RED}${#missing_tools[@]}${NC} 个工具"
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        echo
        warn "缺失的工具: ${missing_tools[*]}"
        echo "运行 'devops install-tools' 进行安装"
    else
        echo
        info "所有工具都已安装！"
    fi
}

# 检查工具是否已安装
function check_tool_installed() {
    local tool=$1
    case "$tool" in
        "docker-compose")
            command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1
            ;;
        *)
            command -v "$tool" >/dev/null 2>&1
            ;;
    esac
}

# 交互式安装
function interactive_install() {
    info "开始环境检查..."
    
    local missing_tools=()
    
    # 检查缺失的工具
    for tool in "${SUPPORTED_TOOLS[@]}"; do
        if ! check_tool_installed "$tool"; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -eq 0 ]]; then
        info "所有工具都已安装，无需安装！"
        return 0
    fi
    
    echo
    warn "发现 ${#missing_tools[@]} 个缺失的工具:"
    for tool in "${missing_tools[@]}"; do
        echo -e "  ${RED}✗${NC} $tool"
    done
    
    echo
    read -p "是否要安装这些工具? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_tools_list "${missing_tools[@]}"
    else
        info "安装已取消"
    fi
}

# 安装所有工具
function install_all_tools() {
    info "开始安装所有支持的工具..."
    install_tools_list "${SUPPORTED_TOOLS[@]}"
}

# 安装指定工具
function install_specific_tools() {
    local tools_str=$1
    IFS=',' read -ra tools_array <<< "$tools_str"
    
    # 验证工具名称
    local valid_tools=()
    for tool in "${tools_array[@]}"; do
        tool=$(echo "$tool" | xargs) # 去除空格
        if [[ " ${SUPPORTED_TOOLS[*]} " =~ " $tool " ]]; then
            valid_tools+=("$tool")
        else
            error "不支持的工具: $tool"
            echo "支持的工具: ${SUPPORTED_TOOLS[*]}"
            return 1
        fi
    done
    
    if [[ ${#valid_tools[@]} -eq 0 ]]; then
        error "没有有效的工具需要安装"
        return 1
    fi
    
    install_tools_list "${valid_tools[@]}"
}

# 安装工具列表
function install_tools_list() {
    local tools=("$@")
    local success_count=0
    local fail_count=0
    
    info "开始安装 ${#tools[@]} 个工具..."
    echo
    
    for tool in "${tools[@]}"; do
        if check_tool_installed "$tool"; then
            echo -e "${GREEN}[SKIP]${NC} $tool 已安装"
            ((success_count++))
            continue
        fi
        
        echo -e "${BLUE}[INSTALL]${NC} 正在安装 $tool..."
        
        if install_single_tool "$tool"; then
            echo -e "${GREEN}[SUCCESS]${NC} $tool 安装成功"
            ((success_count++))
        else
            echo -e "${RED}[FAILED]${NC} $tool 安装失败"
            ((fail_count++))
        fi
        echo
    done
    
    # 显示安装结果
    echo "=================================="
    info "安装完成"
    echo -e "  成功: ${GREEN}$success_count${NC} 个"
    echo -e "  失败: ${RED}$fail_count${NC} 个"
    
    if [[ $fail_count -gt 0 ]]; then
        warn "部分工具安装失败，请检查错误信息或手动安装"
        return 1
    else
        info "所有工具安装成功！"
        return 0
    fi
}

# 安装单个工具
function install_single_tool() {
    local tool=$1

    case "$tool" in
        "git")
            install_package git
            ;;
        "curl")
            install_package curl
            ;;
        "wget")
            install_package wget
            ;;
        "unzip")
            install_package unzip
            ;;
        "docker")
            install_docker_tool
            ;;
        "docker-compose")
            install_docker_compose_tool
            ;;
        "kubectl")
            install_kubectl_tool
            ;;
        "helm")
            install_helm_tool
            ;;
        "java")
            install_java_tool
            ;;
        "maven")
            install_maven_tool
            ;;
        "gradle")
            install_gradle_tool
            ;;
        "node")
            install_nodejs_tool
            ;;
        "npm")
            # npm 通常随 node 一起安装
            install_nodejs_tool
            ;;
        "yarn")
            install_yarn_tool
            ;;
        "go")
            install_go_tool
            ;;
        "expect")
            install_package expect
            ;;
        *)
            error "不支持的工具: $tool"
            return 1
            ;;
    esac
}

# 检测操作系统
function detect_os() {
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
}

# 安装包管理器相关函数
function install_package() {
    local package=$1

    detect_os

    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install -y $package
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y $package
    elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y $package
    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -S --noconfirm $package
    elif command -v brew >/dev/null 2>&1; then
        brew install $package
    else
        error "不支持的包管理器，请手动安装 $package"
        return 1
    fi
}

# 安装 Docker
function install_docker_tool() {
    if command -v docker >/dev/null 2>&1; then
        return 0
    fi

    # 使用官方安装脚本
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh

    # 将当前用户添加到docker组
    sudo usermod -aG docker $USER

    # 启动Docker服务
    sudo systemctl enable docker 2>/dev/null || true
    sudo systemctl start docker 2>/dev/null || true

    rm -f /tmp/get-docker.sh
}

# 安装 Docker Compose
function install_docker_compose_tool() {
    # 检查是否已经有 docker compose 插件
    if docker compose version >/dev/null 2>&1; then
        return 0
    fi

    # 检查是否有独立的 docker-compose
    if command -v docker-compose >/dev/null 2>&1; then
        return 0
    fi

    # 安装 Docker Compose
    local compose_version="v2.23.0"
    local compose_url="https://github.com/docker/compose/releases/download/${compose_version}/docker-compose-$(uname -s)-$(uname -m)"

    sudo curl -L "$compose_url" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
}

# 安装 kubectl
function install_kubectl_tool() {
    if command -v kubectl >/dev/null 2>&1; then
        return 0
    fi

    # 获取最新版本
    local kubectl_version=$(curl -L -s https://dl.k8s.io/release/stable.txt)
    local kubectl_url="https://dl.k8s.io/release/${kubectl_version}/bin/linux/amd64/kubectl"

    # 下载并安装
    curl -LO "$kubectl_url"
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
    rm -f kubectl
}

# 安装 Helm
function install_helm_tool() {
    if command -v helm >/dev/null 2>&1; then
        return 0
    fi

    # 使用官方安装脚本
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
}

# 安装 SDKMAN! (Java 工具的前置条件)
function install_sdkman() {
    if [[ -d "$HOME/.sdkman" ]]; then
        return 0
    fi

    curl -s "https://get.sdkman.io" | bash
    source "$HOME/.sdkman/bin/sdkman-init.sh" 2>/dev/null || true
}

# 安装 Java
function install_java_tool() {
    if command -v java >/dev/null 2>&1; then
        return 0
    fi

    # 获取Java版本参数，默认为8
    local java_version=${env[opt_java_version]:-8}

    # 先安装 SDKMAN!
    install_sdkman

    # 初始化 SDKMAN! 环境
    if [[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]]; then
        source "$HOME/.sdkman/bin/sdkman-init.sh"

        # 根据版本选择安装
        case "$java_version" in
            "8")
                sdk install java 8.0.392-tem
                sdk default java 8.0.392-tem
                ;;
            "11")
                sdk install java 11.0.21-tem
                sdk default java 11.0.21-tem
                ;;
            "17")
                sdk install java 17.0.9-tem
                sdk default java 17.0.9-tem
                ;;
            "21")
                sdk install java 21.0.1-tem
                sdk default java 21.0.1-tem
                ;;
            *)
                warn "不支持的Java版本: $java_version，使用默认版本8"
                sdk install java 8.0.392-tem
                sdk default java 8.0.392-tem
                ;;
        esac
    else
        # 备用方案：使用包管理器
        case "$java_version" in
            "8")
                if command -v apt-get >/dev/null 2>&1; then
                    sudo apt-get update && sudo apt-get install -y openjdk-8-jdk
                elif command -v yum >/dev/null 2>&1; then
                    sudo yum install -y java-1.8.0-openjdk-devel
                elif command -v dnf >/dev/null 2>&1; then
                    sudo dnf install -y java-1.8.0-openjdk-devel
                fi
                ;;
            "11")
                if command -v apt-get >/dev/null 2>&1; then
                    sudo apt-get update && sudo apt-get install -y openjdk-11-jdk
                elif command -v yum >/dev/null 2>&1; then
                    sudo yum install -y java-11-openjdk-devel
                elif command -v dnf >/dev/null 2>&1; then
                    sudo dnf install -y java-11-openjdk-devel
                fi
                ;;
            "17")
                if command -v apt-get >/dev/null 2>&1; then
                    sudo apt-get update && sudo apt-get install -y openjdk-17-jdk
                elif command -v yum >/dev/null 2>&1; then
                    sudo yum install -y java-17-openjdk-devel
                elif command -v dnf >/dev/null 2>&1; then
                    sudo dnf install -y java-17-openjdk-devel
                fi
                ;;
            *)
                # 默认安装JDK 8
                if command -v apt-get >/dev/null 2>&1; then
                    sudo apt-get update && sudo apt-get install -y openjdk-8-jdk
                elif command -v yum >/dev/null 2>&1; then
                    sudo yum install -y java-1.8.0-openjdk-devel
                elif command -v dnf >/dev/null 2>&1; then
                    sudo dnf install -y java-1.8.0-openjdk-devel
                else
                    return 1
                fi
                ;;
        esac
    fi
}

# 安装 Maven
function install_maven_tool() {
    if command -v mvn >/dev/null 2>&1; then
        return 0
    fi

    # 先确保 SDKMAN! 已安装
    install_sdkman

    # 初始化 SDKMAN! 环境
    if [[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]]; then
        source "$HOME/.sdkman/bin/sdkman-init.sh"
        sdk install maven
    else
        # 备用方案：使用包管理器
        install_package maven
    fi
}

# 安装 Gradle
function install_gradle_tool() {
    if command -v gradle >/dev/null 2>&1; then
        return 0
    fi

    # 先确保 SDKMAN! 已安装
    install_sdkman

    # 初始化 SDKMAN! 环境
    if [[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]]; then
        source "$HOME/.sdkman/bin/sdkman-init.sh"
        sdk install gradle
    else
        # 备用方案：使用包管理器
        install_package gradle
    fi
}

# 安装 Node.js
function install_nodejs_tool() {
    if command -v node >/dev/null 2>&1; then
        return 0
    fi

    detect_os

    # 使用 NodeSource 仓库安装最新 LTS 版本
    if command -v apt-get >/dev/null 2>&1; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum >/dev/null 2>&1; then
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        sudo yum install -y nodejs npm
    elif command -v dnf >/dev/null 2>&1; then
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        sudo dnf install -y nodejs npm
    elif command -v brew >/dev/null 2>&1; then
        brew install node
    else
        # 备用方案：直接下载二进制文件
        local node_version="v18.18.2"
        local node_url="https://nodejs.org/dist/${node_version}/node-${node_version}-linux-x64.tar.xz"

        cd /tmp
        wget "$node_url"
        sudo tar -C /usr/local --strip-components 1 -xf "node-${node_version}-linux-x64.tar.xz"
        rm -f "node-${node_version}-linux-x64.tar.xz"
    fi
}

# 安装 Yarn
function install_yarn_tool() {
    if command -v yarn >/dev/null 2>&1; then
        return 0
    fi

    # 确保 Node.js 已安装
    if ! command -v npm >/dev/null 2>&1; then
        install_nodejs_tool
    fi

    # 使用 npm 安装 yarn
    sudo npm install -g yarn
}

# 安装 Go
function install_go_tool() {
    if command -v go >/dev/null 2>&1; then
        return 0
    fi

    local go_version="1.21.4"
    local go_url="https://golang.org/dl/go${go_version}.linux-amd64.tar.gz"

    cd /tmp
    wget "$go_url"
    sudo tar -C /usr/local -xzf "go${go_version}.linux-amd64.tar.gz"

    # 添加到PATH
    if ! grep -q "/usr/local/go/bin" /etc/profile; then
        echo 'export PATH=$PATH:/usr/local/go/bin' | sudo tee -a /etc/profile
    fi

    # 添加到当前用户的 .bashrc
    if ! grep -q "/usr/local/go/bin" ~/.bashrc; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    fi

    rm -f "go${go_version}.linux-amd64.tar.gz"
}
