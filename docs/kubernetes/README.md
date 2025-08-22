# Kubernetes 支持指南

## 概述

DevOps 项目完全支持 Kubernetes 部署，包括 namespace 管理、Harbor 集成、imagePullSecrets 自动管理等功能。支持将应用部署到指定的命名空间中，实现环境隔离、多租户管理和资源组织。

## 主要功能

### 1. Namespace 支持

- 🎯 **灵活配置**: 支持配置文件和命令行参数两种方式指定namespace
- 🔄 **自动创建**: 如果指定的namespace不存在，会自动创建
- 🏷️ **模板支持**: 所有Kubernetes模板都支持namespace占位符
- 📦 **优先级**: 命令行参数优先于配置文件设置
- 🛡️ **默认值**: 未指定时使用"default"命名空间

### 2. Harbor 集成

- 🔐 **自动登录**: 工作空间切换时自动登录Harbor
- 🐳 **镜像推送**: 自动推送镜像到Harbor仓库
- 🔑 **Secret管理**: 自动创建和管理K8s Harbor Secret
- 📋 **imagePullSecrets**: 自动在部署文件中添加镜像拉取凭证

### 3. 模板系统

- 📝 **占位符支持**: 支持 `?namespace`、`?module_name`、`?image_path` 等占位符
- 🎨 **多模板**: 支持Spring Boot、Vue.js、Go等多种应用模板
- 🔧 **自动渲染**: 根据参数自动生成部署文件

## 使用方法

### 1. 通过命令行参数指定namespace

```bash
# 部署到指定namespace
devops run java --git-url https://github.com/example/project.git --namespace production my-app

# 部署到开发环境namespace
devops run java --git-url https://github.com/example/project.git --namespace dev-team1 my-app

# 部署到测试环境namespace
devops run vue --git-url https://github.com/example/vue-app.git --namespace testing my-vue-app
```

### 2. 通过配置文件指定namespace

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
      imagePullSecrets:
      - name: ?harbor_secret_name
      containers:
        - name: ?module_name
          image: ?image_path
          ports:
            - containerPort: 8080

---
apiVersion: v1
kind: Service
metadata:
  namespace: ?namespace
  name: ?module_name-service
spec:
  selector:
    app: ?module_name
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
```

### 支持的占位符

| 占位符 | 说明 | 示例值 |
|--------|------|--------|
| `?namespace` | Kubernetes命名空间 | `production` |
| `?module_name` | 应用模块名称 | `my-app` |
| `?image_path` | Docker镜像路径 | `harbor.com/project/my-app:latest` |
| `?harbor_secret_name` | Harbor Secret名称 | `harbor-registry-prod` |
| `?app_port` | 应用端口 | `8080` |
| `?java_opts` | Java启动参数 | `-Xmx512m` |

## Harbor 集成

### 1. 自动Secret管理

当启用Harbor时，系统会自动：

```bash
# 创建docker-registry类型的Secret
kubectl create secret docker-registry harbor-registry-{namespace} \
  --docker-server={harbor_address} \
  --docker-username={harbor_username} \
  --docker-password={harbor_password} \
  --namespace={namespace}
```

### 2. imagePullSecrets自动添加

系统会自动在Deployment的`spec.template.spec`中添加：

```yaml
spec:
  template:
    spec:
      imagePullSecrets:
      - name: harbor-registry-{namespace}
      containers:
      # ... 容器配置
```

### 3. Secret管理命令

```bash
# 管理K8s Harbor Secret
devops env harbor-secret

# 手动登录Harbor
devops env harbor-login
```

## 部署示例

### Spring Boot应用部署

```bash
# 部署Spring Boot应用到生产环境
devops run java my-service \
  --git-url https://github.com/example/my-service.git \
  --namespace production \
  --template spring-boot \
  --java-opts "-Xmx1g -Xms512m"
```

### Vue.js应用部署

```bash
# 部署Vue.js应用到测试环境
devops run vue my-frontend \
  --git-url https://github.com/example/my-frontend.git \
  --namespace testing \
  --template vue-nginx
```

### Go应用部署

```bash
# 部署Go应用到开发环境
devops run go my-api \
  --git-url https://github.com/example/my-api.git \
  --namespace dev \
  --template go
```

## 技术实现

### 1. 参数解析

```bash
# 在 bin/env.sh 中添加
--namespace) env[opt_namespace]=$2; shift 2;;
```

### 2. 配置读取

```bash
# 读取配置文件中的namespace设置
env[cfg_k8s_namespace]=$BUILD_K8S_NAMESPACE

# 优先级处理
if [[ -n "${env[opt_namespace]}" ]]; then
    env[cfg_k8s_namespace]=${env[opt_namespace]}
elif [[ -z "${env[cfg_k8s_namespace]}" ]]; then
    env[cfg_k8s_namespace]="default"
fi
```

### 3. 模板替换

```bash
# 在模板渲染时添加namespace替换
sed -i "s#?namespace#${cfg_k8s_namespace}#g" ./${gen_long_time_str}.yml
```

### 4. Kubernetes部署

```bash
# 本地部署
kubectl apply -f ./${gen_long_time_str}.yml

# 远程部署
ssh ${deploy_user}@${deploy_host} "kubectl apply -f ./${gen_long_time_str}.yml"
```

## 故障排除

### 1. Namespace不存在

```bash
# 检查namespace是否存在
kubectl get namespace

# 手动创建namespace
kubectl create namespace my-namespace
```

### 2. 权限问题

```bash
# 检查kubectl权限
kubectl auth can-i create deployments --namespace my-namespace

# 检查Secret权限
kubectl auth can-i create secrets --namespace my-namespace
```

### 3. 镜像拉取失败

```bash
# 检查Secret是否存在
kubectl get secret harbor-registry-my-namespace -n my-namespace

# 检查Pod事件
kubectl describe pod my-app-pod -n my-namespace
```

## 最佳实践

### 1. 环境隔离

```bash
# 为不同环境使用不同的namespace
devops run java my-app --namespace dev
devops run java my-app --namespace staging
devops run java my-app --namespace production
```

### 2. 资源配置

```bash
# 在模板中添加资源限制
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### 3. 健康检查

```bash
# 在模板中添加健康检查
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
```

## 版本更新

- **v1.7.1**: 新增Kubernetes namespace支持
- **v1.7.1**: 新增Harbor集成和imagePullSecrets自动管理

## 相关文档

- [Harbor集成](../harbor/README.md)
- [工作空间管理](../workspace/README.md)
- [配置参考](../configuration/README.md)
