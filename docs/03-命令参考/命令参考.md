# DevOps 命令参考

## 概述

DevOps 工具提供了一套完整的命令行接口，支持项目构建、部署、工作空间管理等功能。

## 基本语法

```bash
devops [OPTIONS] COMMAND [ARGS...]
```

## 全局选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--build-tool` | string | - | Java构建工具 "maven" 或 "gradle" |
| `--git-url` | string | - | Git仓库地址 |
| `--git-branch` | string | - | Git分支名称 |
| `--svn-url` | string | - | SVN仓库地址 |
| `--java-opts` | string | - | Java启动参数 |
| `--dockerfile` | string | - | 自定义Dockerfile路径 |
| `--template` | string | - | 部署模板名称 |
| `--build-cmds` | string | - | 自定义构建命令 |
| `--build-env` | string | - | 构建环境 "dev" "test" "gray" "prod" 等 |
| `--namespace` | string | "default" | Kubernetes命名空间 |
| `--workspace` | string | - | 指定工作空间 |
| `--app-port` | integer | 80 | 容器内应用端口 |
| `--expose-port` | integer | - | 外部暴露端口（自动启用NodePort） |
| `--force-port` | - | - | 强制覆盖模板中的固定NodePort |
| `-i, --interactive` | - | - | 进入引导式交互配置模式 |
| `--version` | - | - | 显示版本信息 |

## 命令列表

### 1. run - 运行构建和部署

执行项目的构建和部署流程。

#### 语法
```bash
devops run <type> <project-name> [OPTIONS]
```

#### 支持的项目类型
- `java` - Java项目（Spring Boot等）
- `vue` - Vue.js前端项目
- `go` - Go语言项目
- `nginx` - Nginx静态项目
- `tomcat` - Tomcat Web项目

#### 示例
```bash
# 基本用法
devops run java my-app

# 指定模板
devops run java my-app --template spring-boot

# 指定Git仓库
devops run java my-app --git-url https://github.com/example/my-app.git

# 指定命名空间
devops run java my-app --namespace production

# 指定应用端口
devops run java my-app --app-port 8080

# 暴露NodePort端口（自动设置为NodePort类型）
devops run java my-app --expose-port 30080

# 强制覆盖模板中的固定NodePort
devops run java my-app --expose-port 30090 --force-port

## 交互式模式详解

DevOps工具支持交互式模式，通过 `-i` 或 `--interactive` 参数启用。交互式模式提供引导式的配置体验，特别适合新手用户或需要逐步配置的场景。

### 交互式模式特点

1. **引导式配置**: 系统会逐步提示输入必要的参数
2. **智能默认值**: 基于当前环境和配置提供合理的默认值
3. **参数验证**: 实时验证输入参数的有效性
4. **灵活配置**: 支持部分参数交互式输入，部分参数命令行指定

### 支持的交互式命令

#### 1. 工作空间创建 - `devops create workspace <name> -i`

```bash
# 交互式创建工作空间
devops create workspace demo -i
```

交互式提示包括：
- 构建平台选择 (DOCKER_SWARM/KUBERNETES/DOCKER_COMPOSE)
- Kubernetes命名空间配置
- Harbor仓库配置（地址、项目、用户名、密码）
- Git默认分支配置
- Dockerfile启用配置

#### 2. 项目运行 - `devops run <type> [job-name] -i`

```bash
# 交互式运行Java项目
devops run java -i

# 交互式运行Vue项目
devops run vue -i

# 交互式运行指定项目
devops run java my-app -i
```

交互式提示包括：
- 项目名称（如果未指定）
- Git/SVN代码库地址
- 镜像路径配置
- 应用端口配置
- 其他项目特定参数

### 交互式模式使用技巧

1. **混合使用**: 可以在命令行指定部分参数，其余通过交互式输入
   ```bash
   devops run java my-app --git-url https://github.com/example/app.git -i
   ```

2. **跳过提示**: 如果所有必要参数都已通过命令行指定，交互式模式会跳过相应提示

3. **参数验证**: 系统会验证输入参数，如URL格式、端口范围等

4. **取消操作**: 在交互过程中可以按 `Ctrl+C` 取消操作

### 交互式模式示例

```bash
# 创建工作空间
$ devops create workspace production -i
请输入构建平台 (DOCKER_SWARM/KUBERNETES/DOCKER_COMPOSE) [KUBERNETES]: 
请输入Kubernetes命名空间 [default]: production
是否启用Harbor仓库? (y/n) [y]: y
请输入Harbor地址: harbor.company.com
请输入Harbor项目名: production
请输入Harbor用户名: admin
请输入Harbor密码: ****
工作空间创建成功！

# 运行项目
$ devops run java -i
请输入项目名称: user-service
请输入Git代码库地址: https://github.com/company/user-service.git
请输入镜像路径: harbor.company.com/production/user-service
请输入应用端口 [8080]: 8080
请输入Java启动参数 [-Xmx512m]: -Xmx1g
开始构建...
```
```

### 2. env - 环境管理

管理工作空间和环境配置。

#### 子命令

##### env use - 切换工作空间
```bash
devops env use <workspace-name>
```
切换到指定的工作空间，如果该工作空间启用了Harbor，会自动登录。

##### env harbor-login - Harbor登录
```bash
devops env harbor-login
```
手动登录当前工作空间的Harbor镜像仓库。

##### env harbor-secret - Harbor Secret管理
```bash
devops env harbor-secret
```
管理Kubernetes Harbor Secret，提供创建、删除、查看等操作。

#### 示例
```bash
# 切换工作空间
devops env use production

# 登录Harbor
devops env harbor-login

# 管理Harbor Secret
devops env harbor-secret
```

### 3. create workspace - 创建工作空间

创建新的工作空间。

#### 语法
```bash
devops create workspace <name> [OPTIONS]
```

#### 选项
- `-i, --interactive` - 交互式创建模式
- `--platform` - 部署平台 (KUBERNETES/DOCKER_SWARM/DOCKER_COMPOSE)
- `--namespace` - Kubernetes命名空间
- `--git-url` - Git仓库地址
- `--git-branch` - Git分支
- `--maven-settings` - Maven settings.xml路径
- `--gradle-init-script` - Gradle初始化脚本路径
- `--set-default` - 设为默认工作空间

#### 示例
```bash
# 交互式创建
devops create workspace demo -i

# 非交互式创建
devops create workspace demo \
  --platform KUBERNETES \
  --namespace dev \
  --git-url https://git.example.com/org/repo.git \
  --git-branch main \
  --set-default
```

### 4. template - 模板管理

管理和操作部署模板。

#### 语法
```bash
devops template <command> [OPTIONS]
```

#### 子命令

##### template list - 列出所有模板
```bash
devops template list
```
显示所有可用的部署模板。

##### template show - 显示模板详情
```bash
devops template show <template-id>
```
显示指定模板的详细信息。

##### template create - 基于模板创建作业
```bash
devops template create <template-id> <job-name> --workspace <workspace> [OPTIONS]
```
基于指定模板创建工作空间作业。

##### template validate - 验证模板
```bash
devops template validate <workspace> <job-name>
```
验证指定作业的模板配置。

#### 示例
```bash
# 列出所有模板
devops template list

# 显示模板详情
devops template show spring-boot

# 基于模板创建作业
devops template create spring-boot demo-app --workspace youshen \
  --param module_name=demo-app \
  --param git_url=https://github.com/example/demo.git \
  --param image_path=harbor.com/project/demo-app \
  --param namespace=youshen

# 验证模板
devops template validate youshen demo-app
```

### 5. install-tools - 环境工具安装

安装和管理开发环境工具。

#### 语法
```bash
devops install-tools [OPTIONS]
```

#### 选项
- `--check` - 仅检查环境状态
- `--all` - 安装所有支持的工具
- `--tools <tool-list>` - 安装指定工具
- `--java-version <version>` - 指定Java版本 (8/11/17/21)
- `--help` - 显示帮助信息

#### 示例
```bash
# 检查环境状态
devops install-tools --check

# 交互式安装
devops install-tools

# 安装指定工具
devops install-tools --tools docker,kubectl,java

# 安装Java 11
devops install-tools --tools java --java-version 11

# 安装所有工具
devops install-tools --all
```

### 5. help - 帮助信息

显示帮助信息。

#### 语法
```bash
devops help
devops --help
devops -h
```

### 6. version - 版本信息

显示版本信息。

#### 语法
```bash
devops --version
```

## 完整示例

### 1. 创建并配置工作空间
```bash
# 1. 创建工作空间
devops create workspace production -i

# 2. 切换到工作空间
devops env use production

# 3. 登录Harbor（如果需要）
devops env harbor-login

# 4. 部署应用
devops run java my-service \
  --git-url https://github.com/example/my-service.git \
  --template spring-boot \
  --namespace production \
  --java-opts "-Xmx1g -Xms512m" \
  --app-port 8080 \
  --expose-port 30080
```

### 2. 前端项目部署
```bash
# 部署Vue.js项目
devops run vue my-frontend \
  --git-url https://github.com/example/my-frontend.git \
  --template vue-nginx \
  --namespace staging
```

### 3. Go项目部署
```bash
# 部署Go项目
devops run go my-api \
  --git-url https://github.com/example/my-api.git \
  --template go \
  --namespace dev
```

## 端口配置详解

DevOps工具提供了灵活的端口配置选项，支持Kubernetes NodePort的智能管理。

### 端口参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--app-port` | 容器内应用监听端口 | 80 | `--app-port 8080` |
| `--expose-port` | 外部暴露端口（NodePort） | - | `--expose-port 30080` |
| `--force-port` | 强制覆盖模板固定端口 | - | `--force-port` |

### 端口配置规则

#### 1. 基本规则
- 指定 `--expose-port` 自动将Service类型设置为NodePort
- 未指定 `--expose-port` 时保持Service为ClusterIP类型
- `--app-port` 影响容器端口和Service的targetPort

#### 2. 模板兼容性
**模板有 `?node_port` 变量**
```bash
# 替换变量
devops run java my-app --expose-port 30080
# 结果：nodePort: 30080，type: NodePort
```

**模板有固定NodePort值**
```bash
# 默认使用模板值
devops run java my-app --expose-port 30080
# 提示：模板已有固定NodePort: 30123，使用 --force-port 可强制覆盖

# 强制覆盖
devops run java my-app --expose-port 30080 --force-port
# 结果：nodePort: 30080，type: NodePort
```

**模板没有NodePort配置**
```bash
# 动态添加
devops run java my-app --expose-port 30080
# 结果：自动添加 nodePort: 30080，type: NodePort
```

### 使用示例

```bash
# 1. 默认配置（ClusterIP，应用端口80）
devops run java my-app

# 2. 自定义应用端口
devops run java my-app --app-port 8080

# 3. 暴露NodePort
devops run java my-app --app-port 8080 --expose-port 30080

# 4. 强制覆盖模板端口
devops run java my-app --expose-port 30090 --force-port

# 5. 前端项目（默认80端口）
devops run vue my-frontend --expose-port 30081
```

### NodePort范围

Kubernetes NodePort端口范围：**30000-32767**

建议按用途分配：
- **30000-30099**: 开发环境
- **30100-30199**: 测试环境  
- **30200-30299**: 预生产环境
- **30300-30399**: 生产环境

## 环境变量

DevOps工具支持以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DEVOPS_HOME` | DevOps安装目录 | `/opt/devops` |
| `DEVOPS_WORKSPACE` | 默认工作空间 | `production` |
| `DOCKER_HOST` | Docker主机地址 | `tcp://localhost:2375` |

## 配置文件

### 工作空间配置
工作空间配置文件位于 `workspace/<workspace-name>/config`，包含：

```bash
# 构建平台
BUILD_PLATFORM="KUBERNETES"

# Kubernetes命名空间
BUILD_K8S_NAMESPACE="default"

# Harbor配置
BUILD_ENABEL_HARBOR=1
BUILD_HARBOR_ADDRESS="harbor.example.com"
BUILD_HARBOR_PROJECT="myproject"
BUILD_HARBOR_USERNAME="admin"
BUILD_HARBOR_PASSWORD="password"

# Git配置
BUILD_GIT_BRANCH="main"
BUILD_GIT_URL="https://github.com/example/repo.git"
```

### 默认工作空间
默认工作空间配置位于 `workspace/enable`：

```bash
#命令行也可以传入 --workspace foo来指定工作目录 
ENABEL_WORKSPACE_PATH="default"
```

## 故障排除

### 常见错误

1. **命令未找到**
   ```bash
   # 检查安装
   which devops
   
   # 重新安装
   curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash
   ```

2. **权限问题**
   ```bash
   # 检查Docker权限
   docker ps
   
   # 添加用户到docker组
   sudo usermod -aG docker $USER
   ```

3. **网络问题**
   ```bash
   # 检查网络连接
   curl -I https://github.com
   
   # 配置代理（如果需要）
   export HTTP_PROXY=http://proxy.example.com:8080
   export HTTPS_PROXY=http://proxy.example.com:8080
   ```

### 调试模式

启用调试模式获取详细日志：

```bash
# 设置调试环境变量
export DEVOPS_DEBUG=1

# 运行命令
devops run java my-app
```

## 相关文档

- [快速入门](../getting-started/README.md)
- [工作空间管理](../workspace/README.md)
- [配置参考](../configuration/README.md)
- [故障排除](../troubleshooting/README.md)
