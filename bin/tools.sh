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

# 智能提示输入(支持workspace默认值)
function prompt_with_workspace_default() {
    local message=$1
    local var_name=$2
    local workspace_value=$3
    local fallback_default=$4
    local value

    if [[ -n "$workspace_value" ]]; then
        read -p "🔸 $message (可选，默认值为：$workspace_value，回车使用默认值): " value
        value=${value:-$workspace_value}
    elif [[ -n "$fallback_default" ]]; then
        read -p "🔸 $message (默认: $fallback_default): " value
        value=${value:-$fallback_default}
    else
        read -p "🔸 $message: " value
    fi

    eval "$var_name=\"$value\""
}

# 智能必填提示(如果workspace有值则变为可选)
function prompt_smart_required() {
    local message=$1
    local var_name=$2
    local workspace_value=$3
    local value

    if [[ -n "$workspace_value" ]]; then
        read -p "🔸 $message (可选，默认值为：$workspace_value，回车使用默认值): " value
        value=${value:-$workspace_value}
    else
        while [[ -z "$value" ]]; do
            read -p "🔹 $message: " value
            if [[ -z "$value" ]]; then
                warn "此项为必填项，请输入有效值。"
            fi
        done
    fi

    eval "$var_name=\"$value\""
}

# 解析多端口配置
function parse_multi_ports() {
    local port_config="$1"
    local port_type="$2"  # "service" 或 "export"

    if [[ -z "$port_config" ]]; then
        return 0
    fi

    # 支持的格式：
    # 1. 单端口：8080
    # 2. 多端口：8080,9090,3000
    # 3. 命名端口：http:8080,admin:9090
    # 4. 混合格式：8080,admin:9090,3000

    local ports=()
    IFS=',' read -ra PORT_ARRAY <<< "$port_config"

    for port_item in "${PORT_ARRAY[@]}"; do
        port_item=$(echo "$port_item" | xargs)  # 去除空格

        if [[ "$port_item" =~ ^([a-zA-Z0-9-]+):([0-9]+)$ ]]; then
            # 命名端口格式：name:port
            local port_name="${BASH_REMATCH[1]}"
            local port_number="${BASH_REMATCH[2]}"

            # 验证端口号
            if validate_port_number "$port_number" "$port_type"; then
                ports+=("$port_name:$port_number")
            else
                warn "无效的端口号: $port_number (类型: $port_type)"
                continue
            fi
        elif [[ "$port_item" =~ ^[0-9]+$ ]]; then
            # 纯数字端口
            if validate_port_number "$port_item" "$port_type"; then
                ports+=("$port_item")
            else
                warn "无效的端口号: $port_item (类型: $port_type)"
                continue
            fi
        else
            warn "无效的端口格式: $port_item"
            continue
        fi
    done

    # 将解析结果存储到全局数组
    if [[ "$port_type" == "service" ]]; then
        declare -g -a parsed_service_ports=("${ports[@]}")
    elif [[ "$port_type" == "export" ]]; then
        declare -g -a parsed_export_ports=("${ports[@]}")
    fi

    return 0
}

# 验证端口号范围
function validate_port_number() {
    local port="$1"
    local port_type="$2"  # "service", "export", "app"

    if [[ ! "$port" =~ ^[0-9]+$ ]]; then
        return 1
    fi

    case "$port_type" in
        "service"|"app")
            # 服务端口和应用端口：1-65535
            if [[ $port -ge 1 && $port -le 65535 ]]; then
                return 0
            fi
            ;;
        "export")
            # NodePort端口：30000-32767
            if [[ $port -ge 30000 && $port -le 32767 ]]; then
                return 0
            fi
            ;;
    esac

    return 1
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
