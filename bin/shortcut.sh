#!/bin/bash

# DevOps 快捷键功能
# 提供快捷键的创建、管理和执行功能

# 获取当前工作空间路径
function get_current_workspace_path() {
    local current_workspace
    current_workspace=$(get_current_workspace 2>/dev/null)
    
    if [ -z "$current_workspace" ]; then
        current_workspace="default"
    fi
    
    echo "${BUILD_SCRIPT_DIR}/../workspace/$current_workspace"
}

# 检查快捷键是否存在
function is_shortcut_exists() {
    local shortcut_name="$1"
    local workspace_path
    workspace_path=$(get_current_workspace_path)
    
    if [ -z "$shortcut_name" ]; then
        return 1
    fi
    
    python3 "${BUILD_SCRIPT_DIR}/shortcut_manager.py" exists \
        --name "$shortcut_name" \
        --workspace "$workspace_path" >/dev/null 2>&1
    
    return $?
}

# 处理快捷键命令
function handle_shortcut_command() {
    local action="$1"
    shift
    
    case "$action" in
        "save")
            handle_shortcut_save "$@"
            ;;
        "run")
            handle_shortcut_run "$@"
            ;;
        "list")
            handle_shortcut_list "$@"
            ;;
        "show")
            handle_shortcut_show "$@"
            ;;
        "delete"|"remove")
            handle_shortcut_delete "$@"
            ;;
        "edit")
            handle_shortcut_edit "$@"
            ;;
        "help")
            show_shortcut_help
            ;;
        *)
            # 尝试作为快捷键名称执行
            handle_shortcut_run "$action" "$@"
            ;;
    esac
}

# 保存快捷键
function handle_shortcut_save() {
    local shortcut_name="$1"
    shift
    
    if [ -z "$shortcut_name" ]; then
        error "请指定快捷键名称"
        echo "用法: devops shortcut save <名称> <命令...>"
        return 1
    fi
    
    local command_args="$*"
    local description=""
    local tags=""
    local workspace_path
    workspace_path=$(get_current_workspace_path)
    
    # 解析可选参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --description)
                description="$2"
                shift 2
                ;;
            --desc)
                description="$2"
                shift 2
                ;;
            --tags)
                tags="$2"
                shift 2
                ;;
            --from-last)
                # TODO: 从历史命令获取（暂时不实现）
                warn "暂不支持 --from-last 参数"
                shift
                ;;
            *)
                break
                ;;
        esac
    done
    
    # 重新组装命令参数（去掉已解析的参数）
    command_args="$*"
    
    if [ -z "$command_args" ]; then
        error "请指定要保存的命令"
        echo "用法: devops shortcut save <名称> <命令...>"
        return 1
    fi
    
    info "保存快捷键: $shortcut_name"
    
    # 调用Python管理器保存快捷键
    local python_args=(
        "${BUILD_SCRIPT_DIR}/shortcut_manager.py"
        "save"
        "--name" "$shortcut_name"
        "--command" "$command_args"
        "--workspace" "$workspace_path"
    )
    
    if [ -n "$description" ]; then
        python_args+=("--description" "$description")
    fi
    
    if [ -n "$tags" ]; then
        python_args+=("--tags" "$tags")
    fi
    
    if python3 "${python_args[@]}"; then
        success "快捷键 '$shortcut_name' 保存成功"
        info "使用方法: devops $shortcut_name 或 devops shortcut run $shortcut_name"
    else
        error "保存快捷键失败"
        return 1
    fi
}

# 执行快捷键
function handle_shortcut_run() {
    local shortcut_name="$1"
    shift
    
    if [ -z "$shortcut_name" ]; then
        error "请指定快捷键名称"
        echo "用法: devops shortcut run <名称> [覆盖参数...]"
        return 1
    fi
    
    local override_args=""
    local dry_run=false
    local confirm=true
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --override)
                shift
                override_args="$*"
                break
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --yes|-y)
                confirm=false
                shift
                ;;
            *)
                # 其他参数作为覆盖参数
                override_args="$*"
                break
                ;;
        esac
    done
    
    local workspace_path
    workspace_path=$(get_current_workspace_path)
    
    info "执行快捷键: $shortcut_name"
    
    # 获取快捷键命令
    local final_command
    final_command=$(python3 "${BUILD_SCRIPT_DIR}/shortcut_manager.py" get \
        --name "$shortcut_name" \
        --workspace "$workspace_path" \
        --override "$override_args" 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$final_command" ]; then
        error "快捷键不存在: $shortcut_name"
        info "使用 'devops shortcut list' 查看可用的快捷键"
        return 1
    fi
    
    info "命令: $final_command"
    
    # 检查是否需要确认（生产环境相关的快捷键）
    if [[ "$shortcut_name" == *"prod"* ]] || [[ "$final_command" == *"production"* ]] || [[ "$final_command" == *"prod"* ]]; then
        if [ "$confirm" = true ]; then
            warn "这可能是生产环境相关的操作"
            read -p "是否继续执行？ [y/N]: " -r answer
            if [[ ! "$answer" =~ ^[Yy]$ ]]; then
                info "操作已取消"
                return 0
            fi
        fi
    fi
    
    # 预览模式
    if [ "$dry_run" = true ]; then
        info "预览模式 - 不会实际执行命令"
        echo "将要执行的命令: $final_command"
        return 0
    fi
    
    # 执行命令
    info "开始执行..."
    eval "$final_command"
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        success "快捷键执行完成"
    else
        error "快捷键执行失败 (退出码: $exit_code)"
    fi
    
    return $exit_code
}

# 列出快捷键
function handle_shortcut_list() {
    local tags=""
    local format_output=true
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --tags)
                tags="$2"
                shift 2
                ;;
            --simple)
                format_output=false
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    local workspace_path
    workspace_path=$(get_current_workspace_path)
    
    local python_args=(
        "${BUILD_SCRIPT_DIR}/shortcut_manager.py"
        "list"
        "--workspace" "$workspace_path"
    )
    
    if [ -n "$tags" ]; then
        python_args+=("--tags" "$tags")
    fi
    
    if [ "$format_output" = true ]; then
        python_args+=("--format")
    fi
    
    python3 "${python_args[@]}"
}

# 显示快捷键详情
function handle_shortcut_show() {
    local shortcut_name="$1"
    
    if [ -z "$shortcut_name" ]; then
        error "请指定快捷键名称"
        echo "用法: devops shortcut show <名称>"
        return 1
    fi
    
    local workspace_path
    workspace_path=$(get_current_workspace_path)
    
    info "快捷键详情: $shortcut_name"
    echo "----------------------------------------"
    
    python3 "${BUILD_SCRIPT_DIR}/shortcut_manager.py" info \
        --name "$shortcut_name" \
        --workspace "$workspace_path"
}

# 删除快捷键
function handle_shortcut_delete() {
    local shortcut_name="$1"
    
    if [ -z "$shortcut_name" ]; then
        error "请指定快捷键名称"
        echo "用法: devops shortcut delete <名称>"
        return 1
    fi
    
    local workspace_path
    workspace_path=$(get_current_workspace_path)
    
    # 确认删除
    read -p "确定要删除快捷键 '$shortcut_name' 吗？ [y/N]: " -r answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
        info "操作已取消"
        return 0
    fi
    
    if python3 "${BUILD_SCRIPT_DIR}/shortcut_manager.py" delete \
        --name "$shortcut_name" \
        --workspace "$workspace_path"; then
        success "快捷键 '$shortcut_name' 删除成功"
    else
        error "删除快捷键失败"
        return 1
    fi
}

# 编辑快捷键
function handle_shortcut_edit() {
    local shortcut_name="$1"
    
    if [ -z "$shortcut_name" ]; then
        error "请指定快捷键名称"
        echo "用法: devops shortcut edit <名称>"
        return 1
    fi
    
    local workspace_path
    workspace_path=$(get_current_workspace_path)
    
    # 检查快捷键是否存在
    if ! is_shortcut_exists "$shortcut_name"; then
        error "快捷键不存在: $shortcut_name"
        return 1
    fi
    
    # 获取当前信息
    local current_info
    current_info=$(python3 "${BUILD_SCRIPT_DIR}/shortcut_manager.py" info \
        --name "$shortcut_name" \
        --workspace "$workspace_path" 2>/dev/null)
    
    if [ -z "$current_info" ]; then
        error "无法获取快捷键信息"
        return 1
    fi
    
    # 解析当前信息
    local current_command
    local current_description
    current_command=$(echo "$current_info" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('command', ''))")
    current_description=$(echo "$current_info" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('description', ''))")
    
    echo "编辑快捷键: $shortcut_name"
    echo "----------------------------------------"
    echo "当前命令: $current_command"
    echo "当前描述: $current_description"
    echo
    
    # 输入新的命令
    read -p "新命令 (回车保持不变): " -r new_command
    if [ -z "$new_command" ]; then
        new_command="$current_command"
    fi
    
    # 输入新的描述
    read -p "新描述 (回车保持不变): " -r new_description
    if [ -z "$new_description" ]; then
        new_description="$current_description"
    fi
    
    # 更新快捷键
    local python_args=(
        "${BUILD_SCRIPT_DIR}/shortcut_manager.py"
        "update"
        "--name" "$shortcut_name"
        "--workspace" "$workspace_path"
        "--command" "$new_command"
        "--description" "$new_description"
    )
    
    if python3 "${python_args[@]}"; then
        success "快捷键 '$shortcut_name' 更新成功"
    else
        error "更新快捷键失败"
        return 1
    fi
}

# 显示快捷键帮助
function show_shortcut_help() {
    cat << 'EOF'
DevOps 快捷键功能

用法:
  devops shortcut <action> [options]
  devops <shortcut-name> [override-args]

Actions:
  save <name> <command...>     保存快捷键
    --description <desc>       设置描述
    --tags <tag1,tag2>        设置标签
  
  run <name> [args...]         执行快捷键
    --override <args>          覆盖参数
    --dry-run                  预览模式
    --yes                      跳过确认
  
  list [options]               列出快捷键
    --tags <tag1,tag2>        按标签过滤
    --simple                   简单格式
  
  show <name>                  显示快捷键详情
  edit <name>                  编辑快捷键
  delete <name>                删除快捷键
  help                         显示此帮助

示例:
  # 保存复杂的部署命令为快捷键
  devops shortcut save prod-deploy \
    devops run java my-app --build-env prod --namespace production
  
  # 执行快捷键
  devops prod-deploy
  devops shortcut run prod-deploy
  
  # 覆盖参数执行
  devops prod-deploy --override --git-branch hotfix/urgent
  
  # 列出所有快捷键
  devops shortcut list
  
  # 查看快捷键详情
  devops shortcut show prod-deploy

EOF
}
