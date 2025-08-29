#!/bin/bash

# 中间件管理脚本
# 提供中间件的列表、状态查看、日志查看、删除等功能

# 获取脚本所在目录
MIDDLEWARE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 加载依赖脚本
source "$MIDDLEWARE_SCRIPT_DIR/log.sh"
source "$MIDDLEWARE_SCRIPT_DIR/tools.sh"
source "$MIDDLEWARE_SCRIPT_DIR/env.sh"

# 中间件管理主函数
function middleware_main() {
    local action="$1"
    shift
    
    case "$action" in
        list)
            middleware_list "$@"
            ;;
        status)
            middleware_status "$@"
            ;;
        logs)
            middleware_logs "$@"
            ;;
        remove)
            middleware_remove "$@"
            ;;
        scale)
            middleware_scale "$@"
            ;;
        backup)
            middleware_backup "$@"
            ;;
        restore)
            middleware_restore "$@"
            ;;
        info)
            middleware_info "$@"
            ;;
        templates)
            middleware_templates "$@"
            ;;
        *)
            middleware_help
            exit 1
            ;;
    esac
}

# 列出已部署的中间件
function middleware_list() {
    local workspace="${env[opt_workspace]}"
    local format="table"
    local type_filter=""
    local status_filter=""
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --workspace)
                workspace="$2"
                shift 2
                ;;
            --format)
                format="$2"
                shift 2
                ;;
            --type)
                type_filter="$2"
                shift 2
                ;;
            --status)
                status_filter="$2"
                shift 2
                ;;
            *)
                error "未知参数: $1"
                exit 1
                ;;
        esac
    done
    
    info "列出中间件实例 (工作空间: $workspace)"
    
    case "${env[cfg_platform]}" in
        "KUBERNETES")
            middleware_list_k8s "$workspace" "$format" "$type_filter" "$status_filter"
            ;;
        "DOCKER_SWARM")
            middleware_list_swarm "$workspace" "$format" "$type_filter" "$status_filter"
            ;;
        "DOCKER_COMPOSE")
            middleware_list_compose "$workspace" "$format" "$type_filter" "$status_filter"
            ;;
        *)
            error "不支持的平台: ${env[cfg_platform]}"
            exit 1
            ;;
    esac
}

# Kubernetes平台列出中间件
function middleware_list_k8s() {
    local workspace="$1"
    local format="$2"
    local type_filter="$3"
    local status_filter="$4"
    
    local namespace="${env[cfg_k8s_namespace]:-default}"
    
    if ! command -v kubectl >/dev/null 2>&1; then
        error "kubectl命令未找到，请先安装kubectl"
        exit 1
    fi
    
    echo
    if [[ "$format" == "table" ]]; then
        printf "%-20s %-15s %-10s %-15s %-10s\n" "NAME" "TYPE" "STATUS" "AGE" "NAMESPACE"
        printf "%-20s %-15s %-10s %-15s %-10s\n" "----" "----" "------" "---" "---------"
        
        # 查找带有中间件标签的资源
        kubectl get pods -n "$namespace" -l "app.kubernetes.io/managed-by=devops-middleware" \
            --no-headers -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,AGE:.metadata.creationTimestamp" 2>/dev/null | \
        while read -r name status age; do
            if [[ -n "$name" ]]; then
                # 从名称中提取类型
                local middleware_type=$(echo "$name" | sed 's/-[0-9]*$//' | sed 's/.*-\([^-]*\)$/\1/')
                printf "%-20s %-15s %-10s %-15s %-10s\n" "$name" "$middleware_type" "$status" "$age" "$namespace"
            fi
        done
    else
        # JSON或YAML格式输出
        kubectl get pods -n "$namespace" -l "app.kubernetes.io/managed-by=devops-middleware" -o "$format" 2>/dev/null
    fi
}

# Docker Swarm平台列出中间件
function middleware_list_swarm() {
    local workspace="$1"
    local format="$2"
    local type_filter="$3"
    local status_filter="$4"
    
    if ! command -v docker >/dev/null 2>&1; then
        error "docker命令未找到，请先安装docker"
        exit 1
    fi
    
    echo
    if [[ "$format" == "table" ]]; then
        printf "%-20s %-15s %-10s %-15s\n" "NAME" "TYPE" "STATUS" "REPLICAS"
        printf "%-20s %-15s %-10s %-15s\n" "----" "----" "------" "--------"
        
        # 查找带有中间件标签的服务
        docker service ls --filter "label=devops.middleware=true" --format "table {{.Name}}\t{{.Mode}}\t{{.Replicas}}" 2>/dev/null | tail -n +2 | \
        while read -r name mode replicas; do
            if [[ -n "$name" ]]; then
                local middleware_type=$(echo "$name" | sed 's/.*-\([^-]*\)$/\1/')
                printf "%-20s %-15s %-10s %-15s\n" "$name" "$middleware_type" "Running" "$replicas"
            fi
        done
    else
        docker service ls --filter "label=devops.middleware=true" --format "json" 2>/dev/null
    fi
}

# Docker Compose平台列出中间件
function middleware_list_compose() {
    local workspace="$1"
    local format="$2"
    local type_filter="$3"
    local status_filter="$4"
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        error "docker-compose命令未找到，请先安装docker-compose"
        exit 1
    fi
    
    echo
    info "Docker Compose中间件列表功能待实现"
}

# 查看中间件状态
function middleware_status() {
    local instance_name="$1"
    local workspace="${env[opt_workspace]}"
    local detailed=false
    local watch=false
    
    if [[ -z "$instance_name" ]]; then
        error "请指定中间件实例名称"
        echo "使用方法: devops middleware status <instance-name>"
        exit 1
    fi
    
    # 解析参数
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --workspace)
                workspace="$2"
                shift 2
                ;;
            --detailed)
                detailed=true
                shift
                ;;
            --watch)
                watch=true
                shift
                ;;
            *)
                error "未知参数: $1"
                exit 1
                ;;
        esac
    done
    
    info "查看中间件状态: $instance_name (工作空间: $workspace)"
    
    case "${env[cfg_platform]}" in
        "KUBERNETES")
            middleware_status_k8s "$instance_name" "$detailed" "$watch"
            ;;
        "DOCKER_SWARM")
            middleware_status_swarm "$instance_name" "$detailed" "$watch"
            ;;
        "DOCKER_COMPOSE")
            middleware_status_compose "$instance_name" "$detailed" "$watch"
            ;;
        *)
            error "不支持的平台: ${env[cfg_platform]}"
            exit 1
            ;;
    esac
}

# Kubernetes平台查看状态
function middleware_status_k8s() {
    local instance_name="$1"
    local detailed="$2"
    local watch="$3"
    
    local namespace="${env[cfg_k8s_namespace]:-default}"
    
    if [[ "$watch" == "true" ]]; then
        kubectl get pods -n "$namespace" -l "app=$instance_name" --watch
    elif [[ "$detailed" == "true" ]]; then
        kubectl describe pods -n "$namespace" -l "app=$instance_name"
    else
        kubectl get pods -n "$namespace" -l "app=$instance_name" -o wide
    fi
}

# Docker Swarm平台查看状态
function middleware_status_swarm() {
    local instance_name="$1"
    local detailed="$2"
    local watch="$3"
    
    if [[ "$detailed" == "true" ]]; then
        docker service inspect "$instance_name"
    else
        docker service ps "$instance_name"
    fi
}

# Docker Compose平台查看状态
function middleware_status_compose() {
    local instance_name="$1"
    local detailed="$2"
    local watch="$3"
    
    info "Docker Compose状态查看功能待实现"
}

# 查看中间件日志
function middleware_logs() {
    local instance_name="$1"
    local workspace="${env[opt_workspace]}"
    local lines=100
    local follow=false
    local since=""
    local container=""
    
    if [[ -z "$instance_name" ]]; then
        error "请指定中间件实例名称"
        echo "使用方法: devops middleware logs <instance-name>"
        exit 1
    fi
    
    # 解析参数
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --workspace)
                workspace="$2"
                shift 2
                ;;
            --lines)
                lines="$2"
                shift 2
                ;;
            --follow|-f)
                follow=true
                shift
                ;;
            --since)
                since="$2"
                shift 2
                ;;
            --container)
                container="$2"
                shift 2
                ;;
            *)
                error "未知参数: $1"
                exit 1
                ;;
        esac
    done
    
    info "查看中间件日志: $instance_name (工作空间: $workspace)"
    
    case "${env[cfg_platform]}" in
        "KUBERNETES")
            middleware_logs_k8s "$instance_name" "$lines" "$follow" "$since" "$container"
            ;;
        "DOCKER_SWARM")
            middleware_logs_swarm "$instance_name" "$lines" "$follow" "$since"
            ;;
        "DOCKER_COMPOSE")
            middleware_logs_compose "$instance_name" "$lines" "$follow" "$since"
            ;;
        *)
            error "不支持的平台: ${env[cfg_platform]}"
            exit 1
            ;;
    esac
}

# Kubernetes平台查看日志
function middleware_logs_k8s() {
    local instance_name="$1"
    local lines="$2"
    local follow="$3"
    local since="$4"
    local container="$5"
    
    local namespace="${env[cfg_k8s_namespace]:-default}"
    local kubectl_args="logs -n $namespace -l app=$instance_name --tail=$lines"
    
    if [[ "$follow" == "true" ]]; then
        kubectl_args="$kubectl_args -f"
    fi
    
    if [[ -n "$since" ]]; then
        kubectl_args="$kubectl_args --since=$since"
    fi
    
    if [[ -n "$container" ]]; then
        kubectl_args="$kubectl_args -c $container"
    fi
    
    kubectl $kubectl_args
}

# Docker Swarm平台查看日志
function middleware_logs_swarm() {
    local instance_name="$1"
    local lines="$2"
    local follow="$3"
    local since="$4"
    
    local docker_args="service logs --tail $lines"
    
    if [[ "$follow" == "true" ]]; then
        docker_args="$docker_args -f"
    fi
    
    if [[ -n "$since" ]]; then
        docker_args="$docker_args --since $since"
    fi
    
    docker $docker_args "$instance_name"
}

# Docker Compose平台查看日志
function middleware_logs_compose() {
    local instance_name="$1"
    local lines="$2"
    local follow="$3"
    local since="$4"
    
    info "Docker Compose日志查看功能待实现"
}

# 删除中间件
function middleware_remove() {
    local instance_name="$1"
    local workspace="${env[opt_workspace]}"
    local force=false
    local keep_data=false
    local backup_before_remove=false

    if [[ -z "$instance_name" ]]; then
        error "请指定中间件实例名称"
        echo "使用方法: devops middleware remove <instance-name>"
        exit 1
    fi

    # 解析参数
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --workspace)
                workspace="$2"
                shift 2
                ;;
            --force)
                force=true
                shift
                ;;
            --keep-data)
                keep_data=true
                shift
                ;;
            --backup-before-remove)
                backup_before_remove=true
                shift
                ;;
            *)
                error "未知参数: $1"
                exit 1
                ;;
        esac
    done

    # 删除前备份
    if [[ "$backup_before_remove" == "true" ]]; then
        info "删除前备份数据..."
        middleware_backup "$instance_name" --workspace "$workspace"
    fi

    # 确认删除
    if [[ "$force" != "true" ]]; then
        echo "⚠️  警告: 即将删除中间件实例 '$instance_name'"
        if [[ "$keep_data" != "true" ]]; then
            echo "⚠️  数据将被永久删除！"
        fi
        confirm "确认删除?"
    fi

    info "删除中间件: $instance_name (工作空间: $workspace)"

    case "${env[cfg_platform]}" in
        "KUBERNETES")
            middleware_remove_k8s "$instance_name" "$keep_data"
            ;;
        "DOCKER_SWARM")
            middleware_remove_swarm "$instance_name" "$keep_data"
            ;;
        "DOCKER_COMPOSE")
            middleware_remove_compose "$instance_name" "$keep_data"
            ;;
        *)
            error "不支持的平台: ${env[cfg_platform]}"
            exit 1
            ;;
    esac
}

# Kubernetes平台删除中间件
function middleware_remove_k8s() {
    local instance_name="$1"
    local keep_data="$2"
    local namespace="${env[cfg_k8s_namespace]:-default}"

    # 删除部署
    kubectl delete deployment,statefulset,service,configmap,secret -n "$namespace" -l "app=$instance_name" 2>/dev/null || true

    # 删除PVC（除非保留数据）
    if [[ "$keep_data" != "true" ]]; then
        kubectl delete pvc -n "$namespace" -l "app=$instance_name" 2>/dev/null || true
    fi

    success "中间件 '$instance_name' 已删除"
}

# Docker Swarm平台删除中间件
function middleware_remove_swarm() {
    local instance_name="$1"
    local keep_data="$2"

    # 删除服务
    docker service rm "$instance_name" 2>/dev/null || true

    # 删除卷（除非保留数据）
    if [[ "$keep_data" != "true" ]]; then
        docker volume rm "${instance_name}_data" 2>/dev/null || true
    fi

    success "中间件 '$instance_name' 已删除"
}

# Docker Compose平台删除中间件
function middleware_remove_compose() {
    local instance_name="$1"
    local keep_data="$2"

    info "Docker Compose删除功能待实现"
}

# 扩缩容中间件
function middleware_scale() {
    local instance_name="$1"
    local replicas=""
    local workspace="${env[opt_workspace]}"
    local timeout="300s"
    local wait=false

    if [[ -z "$instance_name" ]]; then
        error "请指定中间件实例名称"
        echo "使用方法: devops middleware scale <instance-name> --replicas <count>"
        exit 1
    fi

    # 解析参数
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --replicas)
                replicas="$2"
                shift 2
                ;;
            --workspace)
                workspace="$2"
                shift 2
                ;;
            --timeout)
                timeout="$2"
                shift 2
                ;;
            --wait)
                wait=true
                shift
                ;;
            *)
                error "未知参数: $1"
                exit 1
                ;;
        esac
    done

    if [[ -z "$replicas" ]]; then
        error "请指定副本数量"
        echo "使用方法: devops middleware scale <instance-name> --replicas <count>"
        exit 1
    fi

    info "扩缩容中间件: $instance_name 到 $replicas 个副本"

    case "${env[cfg_platform]}" in
        "KUBERNETES")
            middleware_scale_k8s "$instance_name" "$replicas" "$timeout" "$wait"
            ;;
        "DOCKER_SWARM")
            middleware_scale_swarm "$instance_name" "$replicas"
            ;;
        "DOCKER_COMPOSE")
            middleware_scale_compose "$instance_name" "$replicas"
            ;;
        *)
            error "不支持的平台: ${env[cfg_platform]}"
            exit 1
            ;;
    esac
}

# Kubernetes平台扩缩容
function middleware_scale_k8s() {
    local instance_name="$1"
    local replicas="$2"
    local timeout="$3"
    local wait="$4"
    local namespace="${env[cfg_k8s_namespace]:-default}"

    # 尝试扩缩容StatefulSet
    if kubectl get statefulset "$instance_name" -n "$namespace" >/dev/null 2>&1; then
        kubectl scale statefulset "$instance_name" --replicas="$replicas" -n "$namespace"
        if [[ "$wait" == "true" ]]; then
            kubectl rollout status statefulset "$instance_name" -n "$namespace" --timeout="$timeout"
        fi
    # 尝试扩缩容Deployment
    elif kubectl get deployment "$instance_name" -n "$namespace" >/dev/null 2>&1; then
        kubectl scale deployment "$instance_name" --replicas="$replicas" -n "$namespace"
        if [[ "$wait" == "true" ]]; then
            kubectl rollout status deployment "$instance_name" -n "$namespace" --timeout="$timeout"
        fi
    else
        error "找不到可扩缩容的资源: $instance_name"
        exit 1
    fi

    success "扩缩容完成"
}

# Docker Swarm平台扩缩容
function middleware_scale_swarm() {
    local instance_name="$1"
    local replicas="$2"

    docker service scale "$instance_name=$replicas"
    success "扩缩容完成"
}

# Docker Compose平台扩缩容
function middleware_scale_compose() {
    local instance_name="$1"
    local replicas="$2"

    info "Docker Compose扩缩容功能待实现"
}

# 备份中间件数据
function middleware_backup() {
    local instance_name="$1"
    local workspace="${env[opt_workspace]}"
    local output_path=""
    local compress=false

    if [[ -z "$instance_name" ]]; then
        error "请指定中间件实例名称"
        echo "使用方法: devops middleware backup <instance-name>"
        exit 1
    fi

    # 解析参数
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --workspace)
                workspace="$2"
                shift 2
                ;;
            --output-path)
                output_path="$2"
                shift 2
                ;;
            --compress)
                compress=true
                shift
                ;;
            *)
                error "未知参数: $1"
                exit 1
                ;;
        esac
    done

    # 设置默认备份路径
    if [[ -z "$output_path" ]]; then
        output_path="/tmp/middleware-backup/${instance_name}-$(date +%Y%m%d-%H%M%S)"
    fi

    info "备份中间件数据: $instance_name 到 $output_path"

    case "${env[cfg_platform]}" in
        "KUBERNETES")
            middleware_backup_k8s "$instance_name" "$output_path" "$compress"
            ;;
        "DOCKER_SWARM")
            middleware_backup_swarm "$instance_name" "$output_path" "$compress"
            ;;
        "DOCKER_COMPOSE")
            middleware_backup_compose "$instance_name" "$output_path" "$compress"
            ;;
        *)
            error "不支持的平台: ${env[cfg_platform]}"
            exit 1
            ;;
    esac
}

# Kubernetes平台备份
function middleware_backup_k8s() {
    local instance_name="$1"
    local output_path="$2"
    local compress="$3"
    local namespace="${env[cfg_k8s_namespace]:-default}"

    mkdir -p "$(dirname "$output_path")"

    # 备份PVC数据
    kubectl exec -n "$namespace" "$instance_name-0" -- tar czf - /data > "$output_path.tar.gz" 2>/dev/null || {
        warn "无法备份数据卷，可能是路径不存在或权限不足"
    }

    success "备份完成: $output_path.tar.gz"
}

# Docker Swarm平台备份
function middleware_backup_swarm() {
    local instance_name="$1"
    local output_path="$2"
    local compress="$3"

    info "Docker Swarm备份功能待实现"
}

# Docker Compose平台备份
function middleware_backup_compose() {
    local instance_name="$1"
    local output_path="$2"
    local compress="$3"

    info "Docker Compose备份功能待实现"
}

# 查看连接信息
function middleware_info() {
    local instance_name="$1"
    local workspace="${env[opt_workspace]}"
    local format="text"
    local show_password=false

    if [[ -z "$instance_name" ]]; then
        error "请指定中间件实例名称"
        echo "使用方法: devops middleware info <instance-name>"
        exit 1
    fi

    # 解析参数
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --workspace)
                workspace="$2"
                shift 2
                ;;
            --format)
                format="$2"
                shift 2
                ;;
            --show-password)
                show_password=true
                shift
                ;;
            *)
                error "未知参数: $1"
                exit 1
                ;;
        esac
    done

    info "中间件连接信息: $instance_name"

    case "${env[cfg_platform]}" in
        "KUBERNETES")
            middleware_info_k8s "$instance_name" "$format" "$show_password"
            ;;
        "DOCKER_SWARM")
            middleware_info_swarm "$instance_name" "$format" "$show_password"
            ;;
        "DOCKER_COMPOSE")
            middleware_info_compose "$instance_name" "$format" "$show_password"
            ;;
        *)
            error "不支持的平台: ${env[cfg_platform]}"
            exit 1
            ;;
    esac
}

# Kubernetes平台连接信息
function middleware_info_k8s() {
    local instance_name="$1"
    local format="$2"
    local show_password="$3"
    local namespace="${env[cfg_k8s_namespace]:-default}"

    echo
    echo "📋 连接信息："
    echo "- 内部访问: ${instance_name}.${namespace}.svc.cluster.local"

    # 获取服务端口
    local ports
    ports=$(kubectl get svc "$instance_name" -n "$namespace" -o jsonpath='{.spec.ports[*].port}' 2>/dev/null)
    if [[ -n "$ports" ]]; then
        echo "- 端口: $ports"
    fi

    # 获取外部端口
    local nodeports
    nodeports=$(kubectl get svc "$instance_name" -n "$namespace" -o jsonpath='{.spec.ports[*].nodePort}' 2>/dev/null)
    if [[ -n "$nodeports" ]]; then
        echo "- 外部端口: $nodeports"
    fi

    # 显示密码信息
    if [[ "$show_password" == "true" ]]; then
        local password
        password=$(kubectl get secret "${instance_name}-auth" -n "$namespace" -o jsonpath='{.data.password}' 2>/dev/null | base64 -d)
        if [[ -n "$password" ]]; then
            echo "- 密码: $password"
        fi
    fi
}

# Docker Swarm平台连接信息
function middleware_info_swarm() {
    local instance_name="$1"
    local format="$2"
    local show_password="$3"

    info "Docker Swarm连接信息功能待实现"
}

# Docker Compose平台连接信息
function middleware_info_compose() {
    local instance_name="$1"
    local format="$2"
    local show_password="$3"

    info "Docker Compose连接信息功能待实现"
}

# 模板管理
function middleware_templates() {
    local action="$1"
    shift

    case "$action" in
        list)
            middleware_templates_list "$@"
            ;;
        show)
            middleware_templates_show "$@"
            ;;
        validate)
            middleware_templates_validate "$@"
            ;;
        copy)
            middleware_templates_copy "$@"
            ;;
        create)
            middleware_templates_create "$@"
            ;;
        *)
            echo "Usage: devops middleware templates <list|show|validate|copy|create> [options]"
            exit 1
            ;;
    esac
}

# 列出模板
function middleware_templates_list() {
    local platform=""
    local type=""

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --platform)
                platform="$2"
                shift 2
                ;;
            --type)
                type="$2"
                shift 2
                ;;
            *)
                error "未知参数: $1"
                exit 1
                ;;
        esac
    done

    info "可用的中间件模板："
    echo

    # 列出全局模板
    local templates_dir="${DEVOPS_ROOT}/templates"
    if [[ -d "$templates_dir" ]]; then
        echo "📁 全局模板:"
        for platform_dir in "$templates_dir"/*; do
            if [[ -d "$platform_dir" ]]; then
                local platform_name=$(basename "$platform_dir")
                if [[ -z "$platform" || "$platform" == "$platform_name" ]]; then
                    local middleware_dir="$platform_dir/middleware"
                    if [[ -d "$middleware_dir" ]]; then
                        echo "  [$platform_name]"
                        for template_dir in "$middleware_dir"/*; do
                            if [[ -d "$template_dir" ]]; then
                                local template_name=$(basename "$template_dir")
                                if [[ -z "$type" || "$template_name" == *"$type"* ]]; then
                                    echo "    - $template_name"
                                fi
                            fi
                        done
                    fi
                fi
            fi
        done
    fi

    # 列出工作空间模板
    local workspace_templates_dir="${env[cfg_workspace_path]}/templates"
    if [[ -d "$workspace_templates_dir" ]]; then
        echo
        echo "📁 工作空间模板 (${env[opt_workspace]}):"
        for platform_dir in "$workspace_templates_dir"/*; do
            if [[ -d "$platform_dir" ]]; then
                local platform_name=$(basename "$platform_dir")
                if [[ -z "$platform" || "$platform" == "$platform_name" ]]; then
                    local middleware_dir="$platform_dir/middleware"
                    if [[ -d "$middleware_dir" ]]; then
                        echo "  [$platform_name]"
                        for template_dir in "$middleware_dir"/*; do
                            if [[ -d "$template_dir" ]]; then
                                local template_name=$(basename "$template_dir")
                                if [[ -z "$type" || "$template_name" == *"$type"* ]]; then
                                    echo "    - $template_name"
                                fi
                            fi
                        done
                    fi
                fi
            fi
        done
    fi
}

# 显示模板详情
function middleware_templates_show() {
    local template_name="$1"

    if [[ -z "$template_name" ]]; then
        error "请指定模板名称"
        echo "使用方法: devops middleware templates show <template-name>"
        exit 1
    fi

    # 查找模板
    local platform_dir
    case "${env[cfg_platform]}" in
        "KUBERNETES") platform_dir="k8s" ;;
        "DOCKER_SWARM") platform_dir="swarm" ;;
        "DOCKER_COMPOSE") platform_dir="compose" ;;
        *) platform_dir="k8s" ;;
    esac

    local template_dir
    template_dir=$(find_middleware_template_dir "$platform_dir" "$template_name")
    if [[ $? -ne 0 ]]; then
        error "找不到模板: $template_name"
        exit 1
    fi

    info "模板详情: $template_name"
    echo "路径: $template_dir"
    echo

    # 显示metadata.yaml内容
    if [[ -f "$template_dir/metadata.yaml" ]]; then
        echo "📋 模板元数据:"
        cat "$template_dir/metadata.yaml"
        echo
    fi

    # 列出模板文件
    echo "📁 模板文件:"
    ls -la "$template_dir"
}

# 验证模板
function middleware_templates_validate() {
    local template_name="$1"

    if [[ -z "$template_name" ]]; then
        error "请指定模板名称"
        echo "使用方法: devops middleware templates validate <template-name>"
        exit 1
    fi

    info "验证模板: $template_name"

    # 查找模板
    local platform_dir
    case "${env[cfg_platform]}" in
        "KUBERNETES") platform_dir="k8s" ;;
        "DOCKER_SWARM") platform_dir="swarm" ;;
        "DOCKER_COMPOSE") platform_dir="compose" ;;
        *) platform_dir="k8s" ;;
    esac

    local template_dir
    template_dir=$(find_middleware_template_dir "$platform_dir" "$template_name")
    if [[ $? -ne 0 ]]; then
        error "找不到模板: $template_name"
        exit 1
    fi

    local valid=true

    # 检查必要文件
    if [[ ! -f "$template_dir/deploy.yaml" ]]; then
        error "缺少部署文件: deploy.yaml"
        valid=false
    fi

    if [[ ! -f "$template_dir/metadata.yaml" ]]; then
        warn "缺少元数据文件: metadata.yaml"
    fi

    # 验证YAML语法
    if command -v yamllint >/dev/null 2>&1; then
        if ! yamllint "$template_dir"/*.yaml >/dev/null 2>&1; then
            error "YAML语法错误"
            valid=false
        fi
    fi

    if [[ "$valid" == "true" ]]; then
        success "模板验证通过"
    else
        error "模板验证失败"
        exit 1
    fi
}

# 中间件帮助信息
function middleware_help() {
    echo "Usage: devops middleware <action> [options]"
    echo
    echo "Actions:"
    echo "  list                     列出已部署的中间件"
    echo "  status <name>            查看中间件状态"
    echo "  logs <name>              查看中间件日志"
    echo "  remove <name>            删除中间件"
    echo "  scale <name>             扩缩容中间件"
    echo "  backup <name>            备份中间件数据"
    echo "  restore <name>           恢复中间件数据"
    echo "  info <name>              查看连接信息"
    echo "  templates                模板管理"
    echo
    echo "Examples:"
    echo "  devops middleware list"
    echo "  devops middleware status cache-server"
    echo "  devops middleware logs cache-server --follow"
    echo "  devops middleware remove cache-server"
    echo "  devops middleware scale cache-server --replicas 3"
    echo "  devops middleware templates list"
}

# 如果直接执行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    middleware_main "$@"
fi
