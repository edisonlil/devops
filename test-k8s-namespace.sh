#!/bin/bash

# Kubernetes Namespace 功能测试脚本

echo "=== DevOps Kubernetes Namespace 功能测试 ==="
echo

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}测试场景说明:${NC}"
echo

echo -e "${YELLOW}1. 通过命令行参数指定namespace:${NC}"
echo "devops run java --git-url https://github.com/example/project.git --namespace production my-app"
echo

echo -e "${YELLOW}2. 通过配置文件指定namespace:${NC}"
echo "在 workspace/your-workspace/config 中设置:"
echo "BUILD_K8S_NAMESPACE=\"production\""
echo

echo -e "${YELLOW}3. 优先级测试:${NC}"
echo "命令行参数会覆盖配置文件设置"
echo

echo "=== 配置示例 ==="
echo

cat << 'EOF'
# workspace/meal/config 示例配置
#构建平台，是 DOCKER_SWARM,KUBERNETES
BUILD_PLATFORM="KUBERNETES"

BUILD_DOCKER_STACK_NAME="meal"
BUILD_DOCKER_SWARM_NETWORK="meal-over"

#配置Kubernetes namespace
BUILD_K8S_NAMESPACE="meal-prod"

#配置harbor仓库地址
BUILD_HARBOR_ADDRESS="harbor.example.com"
BUILD_HARBOR_PROJECT="meal"

#启用模板
BUILD_ENABEL_TEMPLATES="meal-zuul"
EOF

echo
echo "=== 模板示例 ==="
echo

cat << 'EOF'
# workspace/meal/template/k8s-template.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: ?namespace
  name: ?module_name
  labels:
    app: ?module_name
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ?module_name
  template:
    metadata:
      labels:
        app: ?module_name
    spec:
      containers:
        - name: ?module_name
          image: ?image_path
          ports:
            - containerPort: 8080

---

apiVersion: v1
kind: Service
metadata:
  name: ?module_name
  namespace: ?namespace
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: ?module_name
EOF

echo
echo "=== 使用示例 ==="
echo

echo -e "${YELLOW}多环境部署:${NC}"
echo "# 开发环境"
echo "devops run java --git-url https://github.com/company/api.git --namespace dev --build-env dev api-service"
echo
echo "# 测试环境"
echo "devops run java --git-url https://github.com/company/api.git --namespace test --build-env test api-service"
echo
echo "# 生产环境"
echo "devops run java --git-url https://github.com/company/api.git --namespace prod --build-env prod api-service"
echo

echo -e "${YELLOW}团队隔离:${NC}"
echo "# 团队A的项目"
echo "devops run java --git-url https://github.com/company/project-a.git --namespace team-a project-a"
echo
echo "# 团队B的项目"
echo "devops run java --git-url https://github.com/company/project-b.git --namespace team-b project-b"
echo

echo -e "${YELLOW}功能分支部署:${NC}"
echo "# 主分支部署到生产namespace"
echo "devops run java --git-url https://github.com/company/app.git --git-branch main --namespace production my-app"
echo
echo "# 功能分支部署到开发namespace"
echo "devops run java --git-url https://github.com/company/app.git --git-branch feature/new-api --namespace dev-feature my-app"
echo

echo "=== 验证步骤 ==="
echo

echo -e "${GREEN}1. 检查帮助信息:${NC}"
echo "devops -h | grep namespace"
echo

echo -e "${GREEN}2. 检查配置文件:${NC}"
echo "cat workspace/meal/config | grep BUILD_K8S_NAMESPACE"
echo

echo -e "${GREEN}3. 检查模板文件:${NC}"
echo "cat workspace/meal/template/k8s-template.yml | grep namespace"
echo

echo -e "${GREEN}4. 测试部署 (需要有效的git仓库):${NC}"
echo "devops run java --git-url YOUR_GIT_URL --namespace test-ns your-app"
echo

echo -e "${GREEN}5. 验证部署结果:${NC}"
echo "kubectl get all -n test-ns"
echo

echo "=== 功能特性 ==="
echo

echo -e "${GREEN}✓${NC} 支持命令行参数 --namespace"
echo -e "${GREEN}✓${NC} 支持配置文件 BUILD_K8S_NAMESPACE"
echo -e "${GREEN}✓${NC} 命令行参数优先于配置文件"
echo -e "${GREEN}✓${NC} 默认使用 'default' namespace"
echo -e "${GREEN}✓${NC} 自动创建不存在的namespace"
echo -e "${GREEN}✓${NC} 模板占位符 ?namespace 自动替换"
echo -e "${GREEN}✓${NC} 支持本地和远程部署"
echo

echo "=== 注意事项 ==="
echo

echo -e "${YELLOW}⚠️${NC}  确保有足够的Kubernetes权限"
echo -e "${YELLOW}⚠️${NC}  namespace名称要符合Kubernetes命名规范"
echo -e "${YELLOW}⚠️${NC}  模板文件中要包含 ?namespace 占位符"
echo -e "${YELLOW}⚠️${NC}  BUILD_PLATFORM 要设置为 'KUBERNETES'"
echo

echo "测试完成！查看 K8S-NAMESPACE-GUIDE.md 获取详细使用指南。"
