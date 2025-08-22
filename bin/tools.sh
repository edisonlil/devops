#!/bin/bash


function check_env_by_cmd_v() {
	command -v $1 > /dev/null 2>&1 || (error "Need to install ##$1## command first and run this script again." && exit 1)
}

# 检查工具是否已安装（不退出）
function check_tool_available() {
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

# 检查并提示安装工具
function check_and_suggest_install() {
    local tool=$1
    local tool_desc=${2:-$tool}

    if ! check_tool_available "$tool"; then
        warn "$tool_desc 未安装"
        info "运行 'devops install-tools --tools $tool' 进行安装"
        return 1
    fi
    return 0
}

# 检查多个工具
function check_multiple_tools() {
    local tools=("$@")
    local missing_tools=()

    for tool in "${tools[@]}"; do
        if ! check_tool_available "$tool"; then
            missing_tools+=("$tool")
        fi
    done

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        warn "以下工具未安装: ${missing_tools[*]}"
        info "运行 'devops install-tools --tools ${missing_tools[*]}' 进行安装"
        return 1
    fi
    return 0
}

# 交互式确认
function confirm() {
    if [[ "${env[opt_interactive]}" != "true" ]]; then
        return 0
    fi

    local message=$1
    local default_choice=${2:-y}

    local prompt="[y/n]"
    if [[ "$default_choice" == "y" ]]; then
        prompt="[Y/n]"
    else
        prompt="[y/N]"
    fi

    while true; do
        read -p "❓ $message $prompt " -r answer
        answer=${answer:-$default_choice}
        case "$answer" in
            [Yy]|[Yy][Ee][Ss]) return 0 ;;
            [Nn]|[Nn][Oo]) error "操作已取消" ; exit 1 ;;
            *) warn "请输入 'y' 或 'n'" ;;
        esac
    done
}


# 提示输入(必填)
function prompt_required() {
    local message=$1
    local var_name=$2
    local value=""
    while [[ -z "$value" ]]; do
        read -p "🔹 $message: " value
        if [[ -z "$value" ]]; then
            warn "此项为必填项，请输入有效值。"
        fi
    done
    eval "$var_name=\"$value\""
}

# 提示输入(可选)
function prompt_optional() {
    local message=$1
    local var_name=$2
    local answer
    read -p "🔸 是否需要配置 '$message'? [y/N] " -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        read -p "   请输入 '$message': " value
        eval "$var_name=\"$value\""
    fi
}

# 提示输入(带默认值)
function prompt_with_default() {
    local message=$1
    local var_name=$2
    local default_value=$3
    local value
    read -p "🔸 $message (默认: $default_value): " value
    value=${value:-$default_value}
    eval "$var_name=\"$value\""
}

# Harbor登录检查函数
function check_harbor_login() {
    local harbor_address=$1
    local harbor_username=$2
    local harbor_password=$3
    
    if [ -z "$harbor_address" ] || [ -z "$harbor_username" ] || [ -z "$harbor_password" ]; then
        return 1
    fi
    
    # 检查是否已经登录
    if docker info | grep -q "$harbor_address"; then
        return 0
    fi
    
    # 尝试登录
    if docker login "$harbor_address" -u "$harbor_username" -p "$harbor_password" >/dev/null 2>&1; then
        success "Harbor 登录成功: $harbor_address"
        return 0
    else
        warn "Harbor 登录失败: $harbor_address"
        return 1
    fi
}
