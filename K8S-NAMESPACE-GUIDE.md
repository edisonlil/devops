# Kubernetes Namespace 使用指南

## 概述

DevOps 项目现在完全支持 Kubernetes namespace，允许您将应用部署到指定的命名空间中。这对于环境隔离、多租户管理和资源组织非常有用。

## 功能特性

- 🎯 **灵活配置**: 支持配置文件和命令行参数两种方式指定namespace
- 🔄 **自动创建**: 如果指定的namespace不存在，会自动创建
- 🏷️ **模板支持**: 所有Kubernetes模板都支持namespace占位符
- 📦 **优先级**: 命令行参数优先于配置文件设置
- 🛡️ **默认值**: 未指定时使用"default"命名空间

## 使用方法

### 1. 通过命令行参数指定

```bash
# 部署到指定namespace
devops run java --git-url https://github.com/example/project.git --namespace production my-app

# 部署到开发环境namespace
devops run java --git-url https://github.com/example/project.git --namespace dev-team1 my-app

# 部署到测试环境namespace
devops run vue --git-url https://github.com/example/vue-app.git --namespace testing my-vue-app
```

### 2. 通过配置文件指定

在工作空间的 `config` 文件中添加：

```bash
# 配置Kubernetes namespace
BUILD_K8S_NAMESPACE="production"
```

示例配置文件：
```bash
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
```

### 3. 优先级规则

1. **命令行参数** (`--namespace`) - 最高优先级
2. **配置文件** (`BUILD_K8S_NAMESPACE`) - 中等优先级  
3. **默认值** (`default`) - 最低优先级

```bash
# 即使配置文件中设置了namespace，命令行参数也会覆盖
devops run java --git-url https://github.com/example/project.git --namespace override-ns my-app
```

## 模板配置

### Kubernetes模板示例

创建支持namespace的Kubernetes模板文件：

```yaml
# workspace/your-workspace/template/k8s-template.yml
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
```

### 模板占位符

DevOps 支持以下占位符，会在部署时自动替换：

- `?namespace` - Kubernetes命名空间
- `?module_name` - 模块/应用名称
- `?image_path` - Docker镜像路径
- `?network` - Docker Swarm网络名称

## 实际使用场景

### 场景1：多环境部署

```bash
# 开发环境
devops run java --git-url https://github.com/company/api.git --namespace dev --build-env dev api-service

# 测试环境
devops run java --git-url https://github.com/company/api.git --namespace test --build-env test api-service

# 生产环境
devops run java --git-url https://github.com/company/api.git --namespace prod --build-env prod api-service
```

### 场景2：团队隔离

```bash
# 团队A的项目
devops run java --git-url https://github.com/company/project-a.git --namespace team-a project-a

# 团队B的项目
devops run java --git-url https://github.com/company/project-b.git --namespace team-b project-b
```

### 场景3：功能分支部署

```bash
# 主分支部署到生产namespace
devops run java --git-url https://github.com/company/app.git --git-branch main --namespace production my-app

# 功能分支部署到开发namespace
devops run java --git-url https://github.com/company/app.git --git-branch feature/new-api --namespace dev-feature my-app
```

## 最佳实践

### 1. 命名规范

建议使用以下命名规范：

```bash
# 环境相关
dev, test, staging, prod

# 团队相关
team-frontend, team-backend, team-devops

# 项目相关
project-api, project-web, project-admin

# 功能相关
feature-auth, feature-payment, feature-notification
```

### 2. 配置管理

```bash
# 在不同工作空间中配置不同的默认namespace
workspace/dev/config:     BUILD_K8S_NAMESPACE="dev"
workspace/test/config:    BUILD_K8S_NAMESPACE="test"
workspace/prod/config:    BUILD_K8S_NAMESPACE="prod"
```

### 3. 权限管理

确保部署用户有相应namespace的权限：

```bash
# 检查当前用户权限
kubectl auth can-i create deployments --namespace=your-namespace

# 检查namespace是否存在
kubectl get namespace your-namespace
```

## 故障排除

### 常见问题

1. **Namespace不存在**
   ```bash
   # DevOps会自动创建namespace，但如果权限不足会失败
   # 手动创建namespace
   kubectl create namespace your-namespace
   ```

2. **权限不足**
   ```bash
   # 检查RBAC权限
   kubectl describe rolebinding -n your-namespace
   kubectl describe clusterrolebinding
   ```

3. **模板中namespace未替换**
   ```bash
   # 检查模板文件是否包含 ?namespace 占位符
   # 检查配置是否正确设置
   ```

### 调试命令

```bash
# 查看生成的部署文件
cat deploy/your-workspace/your-app.yml

# 检查namespace配置
devops -h  # 查看help信息确认namespace参数

# 验证部署结果
kubectl get all -n your-namespace
```

## 更新日志

### v1.7.0
- 新增 `--namespace` 命令行参数支持
- 新增 `BUILD_K8S_NAMESPACE` 配置文件支持
- 自动创建不存在的namespace
- 完善模板占位符替换
- 更新帮助文档和示例

## 总结

通过namespace支持，DevOps现在可以更好地管理Kubernetes环境中的应用部署，实现：

- 🏢 **多环境隔离** - dev/test/prod环境分离
- 👥 **多团队协作** - 不同团队使用不同namespace
- 🔒 **资源隔离** - 防止不同项目间的资源冲突
- 📊 **资源管理** - 更好的资源配额和监控

使用namespace功能，让您的Kubernetes部署更加规范和安全！
