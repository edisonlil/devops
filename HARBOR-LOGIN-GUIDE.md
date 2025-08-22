# Harbor登录功能使用指南

## 功能概述

本功能为DevOps工具添加了Harbor登录凭证管理，支持在工作空间创建和切换时自动登录Harbor，避免后续推送镜像失败。

## 新增功能

### 1. 工作空间配置增强

工作空间配置文件现在支持Harbor登录凭证：

```bash
# 是否启用harbor仓库
BUILD_ENABEL_HARBOR=1
# 配置harbor仓库地址
BUILD_HARBOR_ADDRESS="harbor.example.com"
# 配置harbor仓库项目
BUILD_HARBOR_PROJECT="myproject"
# 配置harbor用户名
BUILD_HARBOR_USERNAME="admin"
# 配置harbor密码
BUILD_HARBOR_PASSWORD="Harbor12345"
```

### 2. 交互式创建工作空间

创建支持Harbor的工作空间：

```bash
# 交互式创建
devops create workspace my-workspace -i

# 非交互式创建
devops create workspace my-workspace \
  --platform KUBERNETES \
  --namespace dev \
  --harbor harbor.example.com/myproject \
  --set-default
```

在交互式模式下，系统会提示输入：
- Harbor地址和项目 (addr/project)
- Harbor用户名
- Harbor密码（密码输入时不会显示）

### 3. 自动登录功能

#### 创建工作空间时自动登录
创建支持Harbor的工作空间后，系统会自动执行docker login。

#### 切换工作空间时自动登录
```bash
devops env use my-workspace
```
切换工作空间时，如果该工作空间启用了Harbor，系统会自动登录。

### 4. 手动登录命令

```bash
# 登录当前工作空间的Harbor
devops env harbor-login
```

### 5. K8s Harbor Secret管理

```bash
# 管理K8s Harbor Secret（创建、删除、查看）
devops env harbor-secret
```

### 6. 构建时登录检查

在执行构建命令时，系统会自动检查Harbor登录状态：

```bash
devops run java my-app --template spring-boot
```

如果登录失败，会显示警告信息，但不会中断构建过程。

### 7. K8s镜像拉取支持

对于K8s平台，系统会自动：
- 创建docker-registry类型的Secret
- 在部署YAML中自动添加imagePullSecrets配置
- 支持模板中已有的imagePullSecrets配置

Secret命名规则：`harbor-registry-{namespace}`

## 使用示例

### 示例1：创建并配置Harbor工作空间

```bash
# 1. 创建工作空间
devops create workspace production -i

# 按提示输入：
# 工作空间名称: production
# 平台: 1 (KUBERNETES)
# 命名空间: prod
# 启用Harbor: 1
# Harbor地址: harbor.company.com/prod
# Harbor用户名: deploy-user
# Harbor密码: [输入密码]
# 设为默认: y

# 2. 系统会自动登录Harbor
# 3. 执行构建
devops run java my-service --template spring-boot
```

### 示例2：切换工作空间

```bash
# 切换到测试环境
devops env use test-env

# 系统会自动登录测试环境的Harbor
# 然后可以执行构建
devops run java my-service --template spring-boot
```

### 示例3：手动登录Harbor

```bash
# 如果登录过期，可以手动重新登录
devops env harbor-login
```

### 示例4：管理K8s Harbor Secret

```bash
# 管理K8s Harbor Secret
devops env harbor-secret

# 系统会显示交互式菜单：
# 1) 重新创建 Secret
# 2) 删除 Secret  
# 3) 查看 Secret 详情
# 4) 退出
```

## 配置文件示例

### 生产环境配置 (workspace/production/config)

```bash
#构建平台，是 DOCKER_SWARM,KUBERNETES,DOCKER_COMPOSE
BUILD_PLATFORM="KUBERNETES"

#配置Kubernetes namespace
BUILD_K8S_NAMESPACE="prod"

#是否启用harbor仓库
BUILD_ENABEL_HARBOR=1
#配置harbor仓库地址
BUILD_HARBOR_ADDRESS="harbor.company.com"
#配置harbor仓库
BUILD_HARBOR_PROJECT="prod"
#配置harbor用户名
BUILD_HARBOR_USERNAME="deploy-user"
#配置harbor密码
BUILD_HARBOR_PASSWORD="secure-password"

#Git 默认分支
BUILD_GIT_BRANCH="main"
```

### 测试环境配置 (workspace/test/config)

```bash
#构建平台，是 DOCKER_SWARM,KUBERNETES,DOCKER_COMPOSE
BUILD_PLATFORM="KUBERNETES"

#配置Kubernetes namespace
BUILD_K8S_NAMESPACE="test"

#是否启用harbor仓库
BUILD_ENABEL_HARBOR=1
#配置harbor仓库地址
BUILD_HARBOR_ADDRESS="harbor.company.com"
#配置harbor仓库
BUILD_HARBOR_PROJECT="test"
#配置harbor用户名
BUILD_HARBOR_USERNAME="test-user"
#配置harbor密码
BUILD_HARBOR_PASSWORD="test-password"

#Git 默认分支
BUILD_GIT_BRANCH="develop"
```

## 安全注意事项

1. **密码存储**：Harbor密码以明文形式存储在配置文件中，请确保配置文件权限设置正确
2. **网络访问**：确保构建环境能够访问Harbor服务器
3. **凭证管理**：建议定期更新Harbor密码
4. **权限控制**：为不同环境使用不同的Harbor用户，限制权限范围

## 故障排除

### 1. Harbor登录失败

```bash
# 检查网络连接
ping harbor.example.com

# 检查Docker配置
docker info

# 手动测试登录
docker login harbor.example.com -u username -p password
```

### 2. 配置文件问题

```bash
# 检查工作空间配置
cat workspace/my-workspace/config

# 验证配置语法
source workspace/my-workspace/config
echo $BUILD_HARBOR_ADDRESS
```

### 3. 权限问题

```bash
# 检查配置文件权限
ls -la workspace/my-workspace/config

# 设置正确的权限
chmod 600 workspace/my-workspace/config
```

## 生成的K8s YAML示例

当启用Harbor时，生成的部署文件会自动包含imagePullSecrets：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      imagePullSecrets:
      - name: harbor-registry-dev
      containers:
      - name: my-app
        image: harbor.company.com/project/my-app_2024-01-15_abc123:latest
        ports:
        - containerPort: 8080
        env:
        - name: JAVA_OPTS
          value: "-Xmx512m"
```

## 更新日志

- **v1.7.1**: 新增Harbor登录凭证管理功能
  - 支持工作空间级别的Harbor配置
  - 自动登录功能
  - 构建时登录状态检查
  - 手动登录命令
  - K8s Harbor Secret自动管理
  - 自动添加imagePullSecrets配置
