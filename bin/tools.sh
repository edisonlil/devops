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