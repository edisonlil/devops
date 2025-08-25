#!/bin/bash

# 获取脚本所在目录
VERSION_MANAGER_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$VERSION_MANAGER_SCRIPT_DIR/log.sh"

# 版本管理器函数

# 解析构建环境参数，提取版本信息
function parse_build_env() {
    local build_env="$1"
    local versions=()
    
    if [[ -z "$build_env" ]]; then
        return 0
    fi
    
    # 分割多个版本配置（逗号分隔）
    IFS=',' read -ra env_parts <<< "$build_env"
    
    for part in "${env_parts[@]}"; do
        # 检查是否包含版本信息（格式：tool:version）
        if [[ "$part" =~ ^([^:]+):(.+)$ ]]; then
            local tool="${BASH_REMATCH[1]}"
            local version="${BASH_REMATCH[2]}"
            versions+=("$tool:$version")
        fi
    done
    
    echo "${versions[@]}"
}
    
# 设置Node.js版本
function set_node_version() {
    local version="$1"
    
    if [[ -z "$version" ]]; then
        return 0
    fi
    
    info "设置Node.js版本: $version"
    
    # 检查nvm是否可用
    if command -v nvm &> /dev/null; then
        nvm use "$version" 2>/dev/null || nvm install "$version"
        return $?
    fi
    
    # 检查fnm是否可用
    if command -v fnm &> /dev/null; then
        fnm use "$version" 2>/dev/null || fnm install "$version"
        return $?
    fi
    
    # 检查n是否可用
    if command -v n &> /dev/null; then
        n "$version"
        return $?
    fi
    
    warn "未找到Node.js版本管理器（nvm/fnm/n），使用系统默认版本"
    return 0
}
    
# 设置Java版本
function set_java_version() {
    local version="$1"
    
    if [[ -z "$version" ]]; then
        return 0
    fi
    
    info "设置Java版本: $version"
    
    # 检查sdkman是否可用
    if command -v sdk &> /dev/null; then
        sdk use java "$version" 2>/dev/null || sdk install java "$version"
        return $?
    fi
    
    # 检查JAVA_HOME环境变量
    if [[ -n "$JAVA_HOME" ]]; then
        local java_version=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
        if [[ "$java_version" == "$version"* ]]; then
            info "当前Java版本符合要求: $java_version"
            return 0
        fi
    fi
    
    warn "未找到Java版本管理器（sdkman），使用系统默认版本"
    return 0
}
    
# 设置Maven版本
function set_maven_version() {
    local version="$1"
    
    if [[ -z "$version" ]]; then
        return 0
    fi
    
    info "设置Maven版本: $version"
    
    # 检查sdkman是否可用
    if command -v sdk &> /dev/null; then
        sdk use maven "$version" 2>/dev/null || sdk install maven "$version"
        return $?
    fi
    
    # 检查当前Maven版本
    if command -v mvn &> /dev/null; then
        local maven_version=$(mvn -version 2>&1 | head -n 1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
        if [[ "$maven_version" == "$version"* ]]; then
            info "当前Maven版本符合要求: $maven_version"
            return 0
        fi
    fi
    
    warn "未找到Maven版本管理器（sdkman），使用系统默认版本"
    return 0
}
    
# 设置Gradle版本
function set_gradle_version() {
    local version="$1"
    
    if [[ -z "$version" ]]; then
        return 0
    fi
    
    info "设置Gradle版本: $version"
    
    # 检查sdkman是否可用
    if command -v sdk &> /dev/null; then
        sdk use gradle "$version" 2>/dev/null || sdk install gradle "$version"
        return $?
    fi
    
    # 检查当前Gradle版本
    if command -v gradle &> /dev/null; then
        local gradle_version=$(gradle --version 2>&1 | grep "Gradle" | head -n 1 | grep -o '[0-9]\+\.[0-9]\+')
        if [[ "$gradle_version" == "$version"* ]]; then
            info "当前Gradle版本符合要求: $gradle_version"
            return 0
        fi
    fi
    
    warn "未找到Gradle版本管理器（sdkman），使用系统默认版本"
    return 0
}
    
# 设置Volta版本
function set_volta_version() {
    local version="$1"
    
    if [[ -z "$version" ]]; then
        return 0
    fi
    
    info "设置Volta版本: $version"
    
    # 检查volta是否可用
    if command -v volta &> /dev/null; then
        # Volta会自动管理Node.js和npm版本
        # 检查当前Node.js版本
        local current_node_version=$(node --version 2>/dev/null)
        if [[ "$current_node_version" == "v$version"* ]]; then
            info "当前Node.js版本符合要求: $current_node_version"
            return 0
        fi
        
        # 使用volta安装指定版本
        info "使用Volta安装Node.js版本: $version"
        volta install node@"$version"
        return $?
    fi
    
    warn "未找到Volta版本管理器，使用系统默认版本"
    return 0
}
    
# 应用版本配置
function apply_versions() {
    local build_env="$1"
    local versions=($(parse_build_env "$build_env"))
    
    for version_config in "${versions[@]}"; do
        if [[ "$version_config" =~ ^([^:]+):(.+)$ ]]; then
            local tool="${BASH_REMATCH[1]}"
            local version="${BASH_REMATCH[2]}"
            
            case "$tool" in
                "node")
                    set_node_version "$version"
                    ;;
                "jdk"|"java")
                    set_java_version "$version"
                    ;;
                "maven")
                    set_maven_version "$version"
                    ;;
                "gradle")
                    set_gradle_version "$version"
                    ;;
                "volta")
                    set_volta_version "$version"
                    ;;
                *)
                    # 如果不是版本配置，保持原有的构建环境逻辑
                    ;;
            esac
        fi
    done
}
    
# 获取当前版本信息
function get_current_versions() {
    info "当前环境版本信息："
    
    # Node.js版本
    if command -v node &> /dev/null; then
        local node_version=$(node --version 2>/dev/null)
        echo "  Node.js: $node_version"
    fi
    
    # Java版本
    if command -v java &> /dev/null; then
        local java_version=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
        echo "  Java: $java_version"
    fi
    
    # Maven版本
    if command -v mvn &> /dev/null; then
        local maven_version=$(mvn -version 2>&1 | head -n 1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
        echo "  Maven: $maven_version"
    fi
    
    # Gradle版本
    if command -v gradle &> /dev/null; then
        local gradle_version=$(gradle --version 2>&1 | grep "Gradle" | head -n 1 | grep -o '[0-9]\+\.[0-9]\+')
        echo "  Gradle: $gradle_version"
    fi
    
    # Volta版本
    if command -v volta &> /dev/null; then
        local volta_version=$(volta --version 2>/dev/null)
        echo "  Volta: $volta_version"
    fi
}
