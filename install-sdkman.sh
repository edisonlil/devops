#!/bin/bash

# SDKMAN! 专用安装脚本
# 用于安装和配置 SDKMAN! 以及 Java 生态系统工具

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 显示横幅
show_banner() {
    echo -e "${BLUE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                    SDKMAN! 安装工具                          ║
║                                                              ║
║  SDKMAN! 是管理多个软件开发工具包的工具                        ║
║  支持 Java、Maven、Gradle、Kotlin、Scala 等                  ║
║                                                              ║
║  优势:                                                       ║
║  • 版本管理: 轻松切换不同版本                                 ║
║  • 并行安装: 同时安装多个版本                                 ║
║  • 自动配置: 自动设置环境变量                                 ║
║  • 官方支持: 直接从官方源下载                                 ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# 检查系统要求
check_requirements() {
    log_step "检查系统要求..."
    
    # 检查必需的工具
    local required_tools=("curl" "zip" "unzip")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command_exists $tool; then
            missing_tools+=($tool)
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "缺少必需的工具: ${missing_tools[*]}"
        log_info "请先安装这些工具，然后重新运行脚本"
        
        if command_exists apt-get; then
            log_info "Ubuntu/Debian: sudo apt-get install ${missing_tools[*]}"
        elif command_exists yum; then
            log_info "CentOS/RHEL: sudo yum install ${missing_tools[*]}"
        elif command_exists dnf; then
            log_info "Fedora: sudo dnf install ${missing_tools[*]}"
        fi
        
        exit 1
    fi
    
    log_info "系统要求检查通过"
}

# 安装 SDKMAN!
install_sdkman() {
    log_step "安装 SDKMAN!..."
    
    if [[ -d "$HOME/.sdkman" ]]; then
        log_info "SDKMAN! 已安装在 $HOME/.sdkman"
        return 0
    fi
    
    log_info "从官方源下载并安装 SDKMAN!..."
    curl -s "https://get.sdkman.io" | bash
    
    # 验证安装
    if [[ -d "$HOME/.sdkman" ]]; then
        log_info "SDKMAN! 安装成功"
    else
        log_error "SDKMAN! 安装失败"
        return 1
    fi
}

# 初始化 SDKMAN! 环境
init_sdkman() {
    log_step "初始化 SDKMAN! 环境..."
    
    # 加载 SDKMAN!
    if [[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]]; then
        source "$HOME/.sdkman/bin/sdkman-init.sh"
        log_info "SDKMAN! 环境已初始化"
    else
        log_error "SDKMAN! 初始化脚本不存在"
        return 1
    fi
    
    # 验证 sdk 命令
    if command_exists sdk; then
        log_info "sdk 命令可用"
        sdk version
    else
        log_error "sdk 命令不可用"
        return 1
    fi
}

# 安装 Java
install_java_versions() {
    log_step "安装 Java 版本..."
    
    # 列出可用的 Java 版本
    log_info "获取可用的 Java 版本..."
    
    # 安装推荐的 Java 版本
    local java_versions=(
        "11.0.21-tem"    # Temurin JDK 11 (LTS)
        "17.0.9-tem"     # Temurin JDK 17 (LTS)
        "21.0.1-tem"     # Temurin JDK 21 (LTS)
    )
    
    for version in "${java_versions[@]}"; do
        log_info "安装 Java $version..."
        if sdk install java $version < /dev/null; then
            log_info "✓ Java $version 安装成功"
        else
            log_warn "✗ Java $version 安装失败"
        fi
    done
    
    # 设置默认版本
    log_info "设置 Java 11 为默认版本..."
    sdk default java 11.0.21-tem
    
    # 验证安装
    if command_exists java; then
        log_info "Java 安装验证:"
        java -version
    fi
}

# 安装构建工具
install_build_tools() {
    log_step "安装构建工具..."
    
    # 安装 Maven
    log_info "安装 Maven..."
    if sdk install maven < /dev/null; then
        log_info "✓ Maven 安装成功"
        mvn -version
    else
        log_warn "✗ Maven 安装失败"
    fi
    
    # 安装 Gradle
    log_info "安装 Gradle..."
    if sdk install gradle < /dev/null; then
        log_info "✓ Gradle 安装成功"
        gradle -version
    else
        log_warn "✗ Gradle 安装失败"
    fi
}

# 安装其他工具 (可选)
install_optional_tools() {
    log_step "安装其他开发工具 (可选)..."
    
    local optional_tools=(
        "kotlin"
        "scala"
        "groovy"
        "ant"
        "sbt"
    )
    
    for tool in "${optional_tools[@]}"; do
        read -p "是否安装 $tool? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "安装 $tool..."
            if sdk install $tool < /dev/null; then
                log_info "✓ $tool 安装成功"
            else
                log_warn "✗ $tool 安装失败"
            fi
        fi
    done
}

# 配置 shell 环境
configure_shell() {
    log_step "配置 shell 环境..."
    
    local shell_config=""
    
    # 检测当前 shell
    if [[ -n "$BASH_VERSION" ]]; then
        shell_config="$HOME/.bashrc"
    elif [[ -n "$ZSH_VERSION" ]]; then
        shell_config="$HOME/.zshrc"
    else
        shell_config="$HOME/.profile"
    fi
    
    # 检查是否已经配置
    if grep -q "sdkman-init.sh" "$shell_config" 2>/dev/null; then
        log_info "SDKMAN! 已在 $shell_config 中配置"
    else
        log_info "添加 SDKMAN! 到 $shell_config..."
        echo "" >> "$shell_config"
        echo "# SDKMAN!" >> "$shell_config"
        echo 'export SDKMAN_DIR="$HOME/.sdkman"' >> "$shell_config"
        echo '[[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]] && source "$HOME/.sdkman/bin/sdkman-init.sh"' >> "$shell_config"
        log_info "配置已添加到 $shell_config"
    fi
}

# 显示使用说明
show_usage() {
    log_step "SDKMAN! 使用说明"
    
    cat << EOF

${GREEN}常用命令:${NC}
  sdk list java          # 列出可用的 Java 版本
  sdk install java 17.0.9-tem  # 安装特定版本的 Java
  sdk use java 11.0.21-tem     # 临时切换 Java 版本
  sdk default java 11.0.21-tem # 设置默认 Java 版本
  sdk current java        # 查看当前使用的 Java 版本
  sdk list                # 列出所有可用的 SDK

${GREEN}版本管理:${NC}
  sdk list maven          # 列出可用的 Maven 版本
  sdk install maven 3.9.5 # 安装特定版本的 Maven
  sdk upgrade             # 升级 SDKMAN! 本身

${GREEN}环境管理:${NC}
  sdk env init            # 在项目中初始化 .sdkmanrc 文件
  sdk env                 # 根据 .sdkmanrc 切换环境

${YELLOW}提示:${NC}
- 重新打开终端或运行 'source ~/.bashrc' 来加载环境
- 使用 'sdk help' 查看完整帮助
- 项目目录中可以创建 .sdkmanrc 文件来指定版本

EOF
}

# 验证安装
verify_installation() {
    log_step "验证安装..."
    
    local errors=0
    
    # 检查 SDKMAN!
    if [[ -d "$HOME/.sdkman" ]]; then
        log_info "✓ SDKMAN! 目录存在"
    else
        log_error "✗ SDKMAN! 目录不存在"
        ((errors++))
    fi
    
    # 检查初始化脚本
    if [[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]]; then
        log_info "✓ SDKMAN! 初始化脚本存在"
    else
        log_error "✗ SDKMAN! 初始化脚本不存在"
        ((errors++))
    fi
    
    # 检查命令
    if command_exists sdk; then
        log_info "✓ sdk 命令可用"
    else
        log_error "✗ sdk 命令不可用"
        ((errors++))
    fi
    
    # 检查 Java
    if command_exists java; then
        log_info "✓ Java 可用: $(java -version 2>&1 | head -n1)"
    else
        log_warn "✗ Java 不可用"
    fi
    
    # 检查构建工具
    if command_exists mvn; then
        log_info "✓ Maven 可用: $(mvn -version | head -n1)"
    else
        log_warn "✗ Maven 不可用"
    fi
    
    if command_exists gradle; then
        log_info "✓ Gradle 可用: $(gradle -version | grep Gradle)"
    else
        log_warn "✗ Gradle 不可用"
    fi
    
    return $errors
}

# 主函数
main() {
    show_banner
    
    case "${1:-}" in
        --java-only)
            log_info "仅安装 Java 模式"
            check_requirements
            install_sdkman
            init_sdkman
            install_java_versions
            configure_shell
            ;;
        --minimal)
            log_info "最小安装模式"
            check_requirements
            install_sdkman
            init_sdkman
            configure_shell
            ;;
        --interactive)
            log_info "交互式安装模式"
            check_requirements
            install_sdkman
            init_sdkman
            install_java_versions
            install_build_tools
            install_optional_tools
            configure_shell
            ;;
        *)
            log_info "标准安装模式"
            check_requirements
            install_sdkman
            init_sdkman
            install_java_versions
            install_build_tools
            configure_shell
            ;;
    esac
    
    if verify_installation; then
        show_usage
        log_info "SDKMAN! 安装完成！请重新打开终端或运行 'source ~/.bashrc'"
    else
        log_error "安装过程中出现问题，请检查错误信息"
        exit 1
    fi
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
