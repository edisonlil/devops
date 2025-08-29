#!/bin/bash

# Harbor Docker Compose 安装脚本
# 此脚本用于安装和启动Harbor服务

set -e

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

# 检查Docker和Docker Compose
check_docker() {
    log_info "检查Docker环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker服务未运行，请启动Docker服务"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    log_info "Docker环境检查完成"
}

# 检查端口占用
check_ports() {
    local http_port=${HTTP_PORT:-80}
    local https_port=${HTTPS_PORT:-443}
    
    log_info "检查端口占用情况..."
    
    if netstat -tuln 2>/dev/null | grep -q ":$http_port "; then
        log_warn "端口 $http_port 已被占用"
    fi
    
    if [ "${HTTPS_ENABLED:-false}" = "true" ] && netstat -tuln 2>/dev/null | grep -q ":$https_port "; then
        log_warn "端口 $https_port 已被占用"
    fi
}

# 拉取Harbor镜像
pull_images() {
    log_info "拉取Harbor镜像..."
    
    local harbor_version=${HARBOR_VERSION:-v2.9.0}
    
    # Harbor核心镜像列表
    local images=(
        "goharbor/harbor-log:$harbor_version"
        "goharbor/harbor-db:$harbor_version"
        "goharbor/redis-photon:$harbor_version"
        "goharbor/harbor-registryctl:$harbor_version"
        "goharbor/registry-photon:$harbor_version"
        "goharbor/harbor-core:$harbor_version"
        "goharbor/harbor-portal:$harbor_version"
        "goharbor/harbor-jobservice:$harbor_version"
        "goharbor/nginx-photon:$harbor_version"
        "goharbor/trivy-adapter-photon:$harbor_version"
    )
    
    for image in "${images[@]}"; do
        log_info "拉取镜像: $image"
        docker pull "$image" || log_warn "拉取镜像失败: $image"
    done
    
    log_info "镜像拉取完成"
}

# 启动Harbor服务
start_harbor() {
    log_info "启动Harbor服务..."
    
    # 检查docker-compose.yml文件
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml文件不存在"
        exit 1
    fi
    
    # 停止可能存在的旧服务
    if docker-compose ps -q 2>/dev/null | grep -q .; then
        log_info "停止现有Harbor服务..."
        docker-compose down
    fi
    
    # 启动服务
    docker-compose up -d
    
    log_info "Harbor服务启动完成"
}

# 等待服务就绪
wait_for_harbor() {
    local hostname=${HOSTNAME:-localhost}
    local http_port=${HTTP_PORT:-80}
    local max_attempts=30
    local attempt=1
    
    log_info "等待Harbor服务就绪..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://$hostname:$http_port/api/v2.0/health" > /dev/null 2>&1; then
            log_info "Harbor服务已就绪"
            return 0
        fi
        
        log_info "等待Harbor服务启动... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_warn "Harbor服务启动超时，请检查服务状态"
    return 1
}

# 显示服务状态
show_status() {
    log_info "Harbor服务状态:"
    docker-compose ps
    
    echo
    log_info "Harbor访问信息:"
    local hostname=${HOSTNAME:-localhost}
    local http_port=${HTTP_PORT:-80}
    local https_port=${HTTPS_PORT:-443}
    local https_enabled=${HTTPS_ENABLED:-false}
    
    if [ "$https_enabled" = "true" ]; then
        echo "  Web界面: https://$hostname:$https_port"
        echo "  Docker登录: docker login $hostname:$https_port"
    else
        echo "  Web界面: http://$hostname:$http_port"
        echo "  Docker登录: docker login $hostname:$http_port"
    fi
    
    echo "  管理员用户: admin"
    echo "  管理员密码: ${HARBOR_ADMIN_PASSWORD:-Harbor12345}"
}

# 显示使用说明
show_usage() {
    echo "Harbor Docker Compose 安装脚本"
    echo
    echo "使用方法:"
    echo "  $0 [选项]"
    echo
    echo "选项:"
    echo "  --pull-images    仅拉取镜像，不启动服务"
    echo "  --start-only     仅启动服务，不拉取镜像"
    echo "  --no-wait        不等待服务就绪"
    echo "  --help           显示此帮助信息"
    echo
    echo "环境变量:"
    echo "  HARBOR_VERSION   Harbor版本 (默认: v2.9.0)"
    echo "  HOSTNAME         Harbor主机名 (默认: localhost)"
    echo "  HTTP_PORT        HTTP端口 (默认: 80)"
    echo "  HTTPS_PORT       HTTPS端口 (默认: 443)"
    echo "  HTTPS_ENABLED    是否启用HTTPS (默认: false)"
    echo
}

# 主函数
main() {
    local pull_images_only=false
    local start_only=false
    local no_wait=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --pull-images)
                pull_images_only=true
                shift
                ;;
            --start-only)
                start_only=true
                shift
                ;;
            --no-wait)
                no_wait=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    log_info "开始安装Harbor..."
    
    check_docker
    check_ports
    
    if [ "$start_only" = "false" ]; then
        pull_images
    fi
    
    if [ "$pull_images_only" = "false" ]; then
        start_harbor
        
        if [ "$no_wait" = "false" ]; then
            wait_for_harbor
        fi
        
        show_status
    fi
    
    log_info "Harbor安装完成！"
}

# 执行主函数
main "$@"
