#!/bin/bash

# Harbor Docker Compose 部署准备脚本
# 此脚本用于准备Harbor部署所需的配置文件和目录结构

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

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# 检查必要的工具
check_prerequisites() {
    log_info "检查必要的工具..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    log_info "工具检查完成"
}

# 创建必要的目录结构
create_directories() {
    log_info "创建Harbor数据目录..."
    
    local data_path="${DATA_PATH:-./harbor-data}"
    
    # 创建主要数据目录
    mkdir -p "$data_path"/{ca_download,database,job_logs,log,redis,registry,secret}
    
    # 创建配置目录
    mkdir -p ./common/config/{core,db,jobservice,log,nginx,portal,registry,registryctl,shared/trust-certificates}
    
    # 创建secret目录结构
    mkdir -p "$data_path"/secret/{core,keys,registry}
    
    log_info "目录创建完成"
}

# 生成随机密码
generate_password() {
    local length=${1:-16}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# 生成Harbor配置文件
generate_harbor_config() {
    log_info "生成Harbor配置文件..."
    
    # 如果harbor.yml不存在，从模板复制
    if [ ! -f "./harbor.yml" ]; then
        if [ -f "./harbor.yml.j2" ]; then
            cp "./harbor.yml.j2" "./harbor.yml"
            log_info "从模板复制harbor.yml配置文件"
        else
            log_error "找不到harbor.yml.j2模板文件"
            exit 1
        fi
    fi
    
    log_info "Harbor配置文件准备完成"
}

# 生成SSL证书（自签名）
generate_ssl_certificates() {
    local hostname=${HOSTNAME:-"harbor.local"}
    local cert_dir="./certs"
    
    if [ "${HTTPS_ENABLED:-false}" = "true" ]; then
        log_info "生成SSL证书..."
        
        mkdir -p "$cert_dir"
        
        # 生成私钥
        openssl genrsa -out "$cert_dir/harbor.key" 4096
        
        # 生成证书签名请求
        openssl req -sha512 -new \
            -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=$hostname" \
            -key "$cert_dir/harbor.key" \
            -out "$cert_dir/harbor.csr"
        
        # 生成证书扩展文件
        cat > "$cert_dir/v3.ext" <<-EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1=$hostname
DNS.2=harbor
DNS.3=localhost
IP.1=127.0.0.1
EOF
        
        # 生成证书
        openssl x509 -req -sha512 -days 3650 \
            -extfile "$cert_dir/v3.ext" \
            -CA "$cert_dir/ca.crt" -CAkey "$cert_dir/ca.key" -CAcreateserial \
            -in "$cert_dir/harbor.csr" \
            -out "$cert_dir/harbor.crt"
        
        # 生成CA证书（如果不存在）
        if [ ! -f "$cert_dir/ca.crt" ]; then
            openssl req -newkey rsa:4096 -nodes -sha256 -keyout "$cert_dir/ca.key" \
                -x509 -days 3650 -out "$cert_dir/ca.crt" \
                -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=Harbor-CA"
        fi
        
        log_info "SSL证书生成完成"
    fi
}

# 生成Docker Compose环境文件
generate_env_files() {
    log_info "生成环境配置文件..."
    
    # 生成数据库环境文件
    cat > ./common/config/db/env <<EOF
POSTGRES_PASSWORD=${DATABASE_PASSWORD:-$(generate_password)}
POSTGRES_USER=postgres
POSTGRES_DB=registry
POSTGRES_INITDB_ARGS="--data-checksums"
EOF

    # 生成Core服务环境文件
    cat > ./common/config/core/env <<EOF
CORE_SECRET=${CORE_SECRET:-$(generate_password 32)}
JOBSERVICE_SECRET=${JOBSERVICE_SECRET:-$(generate_password 32)}
EOF

    # 生成JobService环境文件
    cat > ./common/config/jobservice/env <<EOF
CORE_SECRET=${CORE_SECRET:-$(generate_password 32)}
JOBSERVICE_SECRET=${JOBSERVICE_SECRET:-$(generate_password 32)}
EOF

    # 生成RegistryCtl环境文件
    cat > ./common/config/registryctl/env <<EOF
CORE_SECRET=${CORE_SECRET:-$(generate_password 32)}
JOBSERVICE_SECRET=${JOBSERVICE_SECRET:-$(generate_password 32)}
EOF

    log_info "环境配置文件生成完成"
}

# 设置文件权限
set_permissions() {
    log_info "设置文件权限..."
    
    local data_path="${DATA_PATH:-./harbor-data}"
    
    # 设置数据目录权限
    chmod -R 755 "$data_path"
    chmod -R 755 ./common
    
    # 设置脚本执行权限
    if [ -f "./install.sh" ]; then
        chmod +x "./install.sh"
    fi
    
    log_info "权限设置完成"
}

# 验证配置
validate_config() {
    log_info "验证配置..."
    
    if [ ! -f "./harbor.yml" ]; then
        log_error "harbor.yml配置文件不存在"
        exit 1
    fi
    
    if [ ! -f "./docker-compose.yml" ]; then
        log_error "docker-compose.yml文件不存在"
        exit 1
    fi
    
    log_info "配置验证完成"
}

# 显示部署信息
show_deployment_info() {
    local hostname=${HOSTNAME:-"harbor.local"}
    local http_port=${HTTP_PORT:-80}
    local https_port=${HTTPS_PORT:-443}
    local https_enabled=${HTTPS_ENABLED:-false}
    
    echo
    log_info "Harbor部署准备完成！"
    echo
    echo "部署信息："
    echo "  实例名称: ${INSTANCE_NAME:-harbor}"
    echo "  访问地址: $([ "$https_enabled" = "true" ] && echo "https://$hostname:$https_port" || echo "http://$hostname:$http_port")"
    echo "  管理员用户: admin"
    echo "  管理员密码: ${HARBOR_ADMIN_PASSWORD:-Harbor12345}"
    echo
    echo "启动命令："
    echo "  docker-compose up -d"
    echo
    echo "停止命令："
    echo "  docker-compose down"
    echo
}

# 主函数
main() {
    log_info "开始准备Harbor部署环境..."
    
    check_prerequisites
    create_directories
    generate_harbor_config
    generate_ssl_certificates
    generate_env_files
    set_permissions
    validate_config
    show_deployment_info
    
    log_info "Harbor部署环境准备完成！"
}

# 执行主函数
main "$@"
