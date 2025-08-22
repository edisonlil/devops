#!/bin/bash

# 测试imagePullSecrets修复效果

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 创建测试YAML文件
create_test_yaml() {
    cat > test-deploy.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
      - name: test-app
        image: test-app:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: test-app-service
  namespace: test
spec:
  selector:
    app: test-app
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-app-ingress
  namespace: test
spec:
  rules:
  - host: test-app.test.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: test-app-service
            port:
              number: 80
EOF
}

# 测试修复后的逻辑
test_fixed_logic() {
    log_info "测试修复后的imagePullSecrets逻辑..."
    
    # 创建测试文件
    create_test_yaml
    
    log_info "原始YAML文件内容："
    cat test-deploy.yaml
    echo ""
    
    # 模拟修复后的逻辑
    local secret_name="harbor-registry-test"
    local temp_file=$(mktemp)
    local in_deployment=false
    local in_template=false
    local in_spec=false
    local added_imagepullsecrets=false
    
    while IFS= read -r line; do
        echo "$line" >> "$temp_file"
        
        # 检测是否进入Deployment
        if [[ "$line" =~ ^kind:[[:space:]]*Deployment ]]; then
            in_deployment=true
            in_template=false
            in_spec=false
            added_imagepullsecrets=false
        fi
        
        # 检测是否离开Deployment（遇到---分隔符）
        if [[ "$line" =~ ^--- ]] && [ "$in_deployment" = true ]; then
            in_deployment=false
            in_template=false
            in_spec=false
        fi
        
        # 在Deployment内检测template
        if [ "$in_deployment" = true ] && [[ "$line" =~ ^[[:space:]]*template: ]]; then
            in_template=true
            in_spec=false
        fi
        
        # 在template内检测spec
        if [ "$in_deployment" = true ] && [ "$in_template" = true ] && [[ "$line" =~ ^[[:space:]]*spec: ]]; then
            in_spec=true
            # 在spec行后添加imagePullSecrets
            if [ "$added_imagepullsecrets" = false ]; then
                echo "      imagePullSecrets:" >> "$temp_file"
                echo "        - name: $secret_name" >> "$temp_file"
                added_imagepullsecrets=true
            fi
        fi
    done < test-deploy.yaml
    
    # 替换原文件
    mv "$temp_file" test-deploy.yaml
    
    log_success "修复后的YAML文件内容："
    cat test-deploy.yaml
    echo ""
    
    # 验证结果
    log_info "验证结果："
    
    # 检查Deployment中是否有imagePullSecrets
    if awk '/kind: Deployment/,/^---/ { if ($0 ~ /imagePullSecrets:/) { found=1; exit } } END { exit !found }' test-deploy.yaml; then
        log_success "✅ Deployment中正确添加了imagePullSecrets"
    else
        log_error "❌ Deployment中没有找到imagePullSecrets"
    fi
    
    # 检查Service中是否有imagePullSecrets（应该没有）
    if awk '/kind: Service/,/^---/ { if ($0 ~ /imagePullSecrets:/) { found=1; exit } } END { exit !found }' test-deploy.yaml; then
        log_error "❌ Service中不应该有imagePullSecrets，但找到了"
    else
        log_success "✅ Service中没有imagePullSecrets（正确）"
    fi
    
    # 检查Ingress中是否有imagePullSecrets（应该没有）
    if awk '/kind: Ingress/,/^---/ { if ($0 ~ /imagePullSecrets:/) { found=1; exit } } END { exit !found }' test-deploy.yaml; then
        log_error "❌ Ingress中不应该有imagePullSecrets，但找到了"
    else
        log_success "✅ Ingress中没有imagePullSecrets（正确）"
    fi
}

# 清理函数
cleanup() {
    log_info "清理测试文件..."
    rm -f test-deploy.yaml
}

# 主函数
main() {
    log_info "开始测试imagePullSecrets修复效果"
    
    test_fixed_logic
    
    cleanup
    
    log_success "测试完成"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
