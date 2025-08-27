# edisonlil/devops
### 作者：edison,srillia

该脚本从`srillia`中`fork`出来后由`edison`维护，属于`srillia/devops`的分支。

## 最新动态

devops 1.8.5发布
```
多端口配置功能：
- 新增 --service-port 和 --export-port 参数支持多端口配置
- 支持多种端口格式：单端口、多端口、命名端口、混合格式
- 智能端口映射：NodePort自动对应到正确的ServicePort
- 统一端口处理器：融合传统和多端口配置功能
- 完整的交互式支持：引导用户选择端口配置方式
- 完全向后兼容：保持--app-port和--expose-port参数支持
```

devops 1.8.4发布
```
交互式部署功能：
- 支持 devops run <type> <name> -i 启动交互式部署
- 智能显示workspace配置的默认值，提升用户体验
- 必填参数智能变可选：workspace有默认值时自动变为可选
- 引导式配置流程：逐步提示输入必要参数
- 命令预览功能：显示等效的命令行形式
- 完全向后兼容，不影响现有命令行部署方式
```

devops 1.8.3发布
```
Workspace版本配置功能：
- 支持在workspace配置文件中设置默认构建工具版本
- 版本优先级：命令行 --build-version > workspace BUILD_VERSION
- 可选配置，不设置则不应用默认版本
- 配置格式：BUILD_VERSION="node:18.12,jdk:17,maven:3.9.3"
- 完全向后兼容，不影响现有功能
```

devops 1.8.2发布
```
版本管理功能重构：
- 新增 --build-version 参数专门管理构建工具版本
- --build-env 参数专门负责构建环境配置，不再处理版本信息
- 功能完全分离，使用更清晰：
  * 旧方式: --build-env "node:18.12,prod"
  * 新方式: --build-version "node:18.12" --build-env "prod"
- 支持的版本管理器：nvm, fnm, n, volta, sdkman
- 完整的自动补全支持，智能提示版本选项
```

devops 1.8.1发布
```
新增Workspace级别模板功能：
- 支持在workspace中创建自定义模板
- 模板优先级：workspace模板 > 全局模板
- 新增 devops template copy 命令，支持从全局模板复制到workspace
- 构建时自动优先使用workspace模板
- 完全向后兼容，不影响现有功能

模板管理增强：
- devops template list 同时显示全局和workspace模板
- devops template show 支持显示workspace模板详情
- 支持workspace模板的独立定制和维护

模板额外文件支持：
- 支持在workspace模板中添加配置文件（nginx.conf、application.yml等）
- 构建时自动复制模板额外文件到Docker构建上下文
- 可在dockerfile中直接使用COPY指令引用这些文件
- 支持配置文件、脚本文件、证书文件等任意类型文件

自动补全增强：
- 新增 devops template copy 命令的Tab补全支持
- 支持模板ID的智能补全（包括全局和workspace模板）
- 支持 --workspace 选项的workspace名称补全
- 完整支持所有新增命令和选项的自动补全
```

devops 1.8.0发布
```
新增端口配置功能：
- 支持 --app-port 参数配置容器内应用端口（默认80）
- 支持 --expose-port 参数配置NodePort外部端口
- 智能NodePort动态注入，支持模板变量替换
- 支持 --force-port 强制覆盖模板固定端口
- 完美兼容ClusterIP、NodePort、LoadBalancer等服务类型

优化Harbor Secret创建逻辑：
- 修复namespace不存在时Secret创建失败的问题
- 优化Secret创建时机，在namespace创建后执行
- 改进本地和远程部署的Secret管理逻辑
```

devops 1.7.1发布
```
新增 install-tools 功能：
- 自动检测和安装开发环境所需工具
- 支持交互式和批量安装模式
- 支持Java多版本选择（默认JDK 8）
- 支持15种常用开发工具
- 智能跳过已安装工具

新增 Kubernetes namespace 支持：
- 支持通过 --namespace 参数指定命名空间
- 支持配置文件中设置默认namespace
- 自动创建不存在的namespace
- 完善的模板占位符替换

新增命令自动补全功能：
- 支持Tab键自动补全devops命令和选项
- 智能补全项目类型、构建工具、环境等
- 支持workspace和template目录补全
```

devops 1.7.1发布
```
加入go,tomcat项目自动化部署的支持
```
devops 1.6发布
1.6 增加新功能:
```
本地一套环境，支持任意远程集群发布

(解决，devops必须在集群主机上进行构建的局限，现在可以用一个主机作构建，完全和远程集群服务器解耦和)

需要配置 deploy-target文件到 $HOME/.deploy/ 下，在workspace目录里面有样本文件

deploy-target 不配置不启用远程部署，使用本地构建

配置key需要和 --workspace 参数，和工作目录一致 例:

	--workspace meal ,工作目录 meal, deploy-target 文件中存在 key 为meal 的主机配置
```
devops 1.7.1已经发布release

## 简介
基于jenkins publish over ssh 插件，执行的devops cicd远程脚本

## 快速安装

### 在线安装（推荐）

```bash
# 脚本专用安装（推荐用于生产环境）
curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash -s -- --script-only

# 标准安装（包含Java开发环境）
curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash

# 完整安装（包含所有开发工具）
curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash -s -- --full
```

### 离线安装（适用于内网环境）

适用于无法访问外网或对安全性有特殊要求的环境：

```bash
# 方法一：使用 --offline 参数
git clone -b dev https://github.com/edisonlil/devops.git
cd devops
chmod +x install.sh
./install.sh --offline

# 方法二：自动检测（在DevOps项目目录中运行）
cd devops
./install.sh          # 自动检测为离线模式
./install.sh --full   # 离线完整安装
```

**离线安装特点：**
- ✅ 无需网络连接
- ✅ 使用本地代码安装
- ✅ 支持内网环境部署
- ✅ 安装速度更快（~3-5分钟）

详细说明请查看：[离线安装指南](OFFLINE_INSTALL.md)

### 本地安装（传统方式）

```bash
# 克隆项目
git clone -b dev https://github.com/edisonlil/devops.git
cd devops

# 执行安装
chmod +x install.sh
./install.sh
```

### 安装后配置

```bash
# 重新加载环境变量
source ~/.bashrc

# 检查环境状态
devops install-tools --check

# 安装开发工具
devops install-tools

# 验证安装
./test_installation.sh
```

### Python依赖

DevOps工具链现在使用Python脚本进行模板渲染和端口配置，提供更精确的YAML处理能力。

**自动安装**：安装脚本会自动安装Python3和必要的依赖。

**手动验证**：
```bash
# 验证Python依赖
./verify_python_deps.sh

# 运行完整测试
python3 test_all_python_components.py
```

**故障排除**：
```bash
# 重新安装Python依赖
./bin/install_python_deps.sh

# 查看详细说明
cat bin/TEMPLATE_RENDERER_README.md
```

详细安装说明请查看 [安装指南](docs/installation/README.md)

## 开始使用

### 快速开始
```bash
# 1. 安装DevOps工具
curl -fsSL https://github.com/edisonlil/devops/raw/refs/heads/dev/install.sh | bash

# 2. 创建工作空间
devops create workspace demo -i

# 3. 部署应用
devops run java my-app --template spring-boot --app-port 8080 --expose-port 30080
```

### Workspace模板管理

DevOps支持两级模板系统：全局模板和workspace级别模板。

#### 模板优先级
- **Workspace模板** > **全局模板**
- 构建时自动优先使用workspace模板
- 完全向后兼容现有功能

#### 基本操作
```bash
# 列出所有模板（全局和workspace）
devops template list

# 显示模板详情
devops template show spring-boot

# 复制全局模板到workspace
devops template copy spring-boot --workspace demo

# 基于模板创建作业
devops template create spring-boot my-app --workspace demo
```

#### 使用场景
- **全局模板**: 适用于标准化的通用模板，所有workspace共享
- **Workspace模板**: 适用于特定项目的定制需求
  - 可以基于全局模板复制后自定义
  - 不影响全局模板和其他workspace
  - 支持团队级别的模板管理
  - **支持额外文件**: 可在模板目录中添加配置文件（如nginx.conf），构建时自动复制到Docker上下文

#### 模板存储位置
- 全局模板: `templates/`
- Workspace模板: `workspace/{name}/templates/`

#### 高级用法：添加额外配置文件

```bash
# 1. 复制模板到workspace
devops template copy vue-nginx --workspace myproject

# 2. 在workspace模板目录中添加配置文件
echo "worker_processes auto;" > workspace/myproject/templates/k8s/vue-nginx/nginx.conf

# 3. 修改dockerfile引用配置文件
# 在 workspace/myproject/templates/k8s/vue-nginx/dockerfile 中添加：
# COPY nginx.conf /etc/nginx/nginx.conf

# 4. 构建时配置文件会自动复制到Docker上下文
devops run vue my-app --template vue-nginx
```

**支持的额外文件类型**：
- 配置文件（nginx.conf、application.yml等）
- 脚本文件（startup.sh、init.sql等）
- 证书文件（ssl.crt、ssl.key等）
- 任何需要在Docker构建时使用的文件

### 交互式部署

DevOps支持交互式部署模式，提供引导式的配置体验，特别适合新手用户或需要逐步配置的场景。

#### 启动交互式部署

```bash
# 完全交互式部署（会提示选择类型和项目名）
devops run -i

# 指定类型的交互式部署（会提示输入项目名）
devops run java -i
devops run vue -i

# 指定项目的交互式部署（会提示配置参数）
devops run java crm -i
devops run vue frontend -i
```

#### 交互式特点

1. **智能默认值显示**: 自动显示workspace配置的默认值
2. **必填参数智能变可选**: workspace有默认值的参数自动变为可选
3. **引导式配置**: 逐步提示输入必要参数
4. **命令预览**: 显示等效的命令行形式
5. **参数验证**: 实时验证输入参数的有效性

#### 交互式流程

1. **部署类型选择**: 选择java/vue/go/nginx/tomcat
2. **项目名称输入**: 输入项目/模块名称
3. **代码拉取配置**: 选择Git/SVN并配置地址
4. **版本管理配置**: 配置构建工具版本（显示workspace默认值）
5. **部署参数配置**: 配置模板、命名空间、端口等
6. **确认执行**: 预览命令并确认执行

#### 智能提示示例

```bash
# 示例：workspace已配置默认Git地址
🔸 请输入Git地址（可选，默认地址为：https://git.company.com/crm.git，回车使用默认地址）:

# 示例：workspace已配置默认版本
🔸 构建工具版本 (可选，默认值为：node:18.12,jdk:17，回车使用默认值):

# 示例：workspace已配置默认分支
🔸 Git 分支 (可选，默认值为：main，回车使用默认值):
```

### 多端口配置

DevOps支持灵活的多端口配置，可以同时配置多个服务端口和导出端口，并自动建立正确的映射关系。

#### 端口配置参数

- **--service-port**: 配置服务端口，支持多端口和命名端口
- **--export-port**: 配置导出端口（NodePort），支持多端口
- **--app-port**: 传统的单应用端口配置（向后兼容）
- **--expose-port**: 传统的单导出端口配置（向后兼容）

#### 支持的端口格式

```bash
# 单端口
--service-port "8080"
--export-port "30080"

# 多端口
--service-port "8080,9090,3000"
--export-port "30080,30090,30000"

# 命名端口
--service-port "http:8080,admin:9090"
--export-port "http:30080,admin:30090"

# 混合格式
--service-port "8080,admin:9090,3000"
--export-port "30080,admin:30090,30000"
```

#### 端口映射规则

1. **一一对应**: 服务端口和导出端口按顺序一一对应
2. **智能映射**: 自动建立NodePort到ServicePort的正确映射关系
3. **灵活配置**: 支持服务端口多于导出端口，或导出端口多于服务端口
4. **自动类型**: 有导出端口时自动设置Service类型为NodePort

#### 使用示例

```bash
# Web应用多端口配置
devops run java webapp \
  --service-port "http:8080,admin:9090" \
  --export-port "http:30080,admin:30090"

# 微服务多端口配置
devops run vue frontend \
  --service-port "80,8080,3000" \
  --export-port "30080,30081,30082"

# 混合端口配置
devops run java api \
  --service-port "8080,health:9090,metrics:9091" \
  --export-port "30080,30090"
```

#### 端口映射示例

```yaml
# 配置: --service-port "http:8080,admin:9090" --export-port "30080,30090"
# 生成的Service配置:
spec:
  type: NodePort
  ports:
  - name: http
    port: 8080
    targetPort: 8080
    nodePort: 30080
    protocol: TCP
  - name: admin
    port: 9090
    targetPort: 9090
    nodePort: 30090
    protocol: TCP
```

### 构建工具版本管理

DevOps支持独立的构建工具版本管理，与构建环境配置完全分离。

#### 版本管理参数
- **--build-version**: 专门管理构建工具版本
- **--build-env**: 专门管理构建环境配置
- **workspace配置**: 在workspace配置文件中设置默认版本

#### 版本配置优先级
1. **命令行参数** (`--build-version`) - 最高优先级
2. **Workspace配置** (`BUILD_VERSION`) - 默认版本
3. **无版本配置** - 使用系统默认版本

#### 支持的版本管理器
- **Node.js**: nvm, fnm, n, volta
- **Java**: sdkman
- **Maven**: sdkman
- **Gradle**: sdkman

#### 基本用法
```bash
# 指定Node.js版本
devops run vue my-app --build-version "node:18.12"

# 指定多个工具版本
devops run java my-app --build-version "jdk:17,maven:3.9.3"

# 版本管理与构建环境分离
devops run vue my-app --build-version "node:18.12" --build-env "prod"

# 使用Volta管理Node.js
devops run vue my-app --build-version "volta:18.12"

# 使用workspace默认版本（无需指定--build-version）
devops run vue my-app  # 自动使用workspace配置的版本
```

#### Workspace版本配置

支持多种方式配置workspace的默认构建工具版本：

**方式1: 创建时指定**
```bash
# 非交互式创建
devops create workspace demo --build-version "node:18.12,jdk:17"

# 交互式创建（会提示输入版本配置）
devops create workspace demo -i
```

**方式2: 手动编辑配置文件**
```bash
# 编辑 workspace/{name}/config 文件
BUILD_VERSION="node:18.12,jdk:17,maven:3.9.3"
```

**配置示例**：
```bash
# 单个工具版本
BUILD_VERSION="node:18.12"

# 多个工具版本
BUILD_VERSION="jdk:17,maven:3.9.3"

# 注释掉表示不使用默认版本
#BUILD_VERSION=""
```

**使用场景**：
- **团队标准化**: 统一团队使用的构建工具版本
- **项目特定**: 不同项目使用不同的工具版本
- **环境一致性**: 确保开发、测试、生产环境版本一致
- **简化命令**: 无需每次都指定版本参数

### Vue 项目镜像库配置

DevOps 为 Vue 项目提供了专门的 npm 镜像库配置功能，支持私有镜像库和认证管理。

#### 配置项
- **BUILD_VUE_REGISTRY**: npm 镜像库地址
- **BUILD_VUE_REGISTRY_AUTH**: 认证信息（用户名密码或 token）

#### 配置示例
```bash
# workspace/my-project/config
BUILD_VUE_REGISTRY="https://registry.npmmirror.com"
BUILD_VUE_REGISTRY_AUTH="username:password"
```

#### 使用方法
```bash
# 使用工作空间配置的镜像库
devops run vue my-app --git-url https://github.com/user/vue-app.git

# 临时使用其他镜像库
devops run vue my-app --build-cmds "npm config set registry https://registry.npm.taobao.org && npm install && npm run build"
```

#### 常用镜像源
- **阿里云**: https://registry.npmmirror.com
- **淘宝**: https://registry.npm.taobao.org
- **华为云**: https://mirrors.huaweicloud.com/repository/npm/
- **腾讯云**: https://mirrors.cloud.tencent.com/npm/

#### 版本格式
```bash
# Node.js版本
node:18.12    # 具体版本
node:18       # 主版本
node:lts      # LTS版本

# Java版本
jdk:17        # JDK 17
java:17       # Java 17 (与jdk:17相同)

# Maven版本
maven:3.9.3   # 具体版本

# Gradle版本
gradle:8.0    # 具体版本

# Volta版本
volta:18.12   # 通过Volta管理的Node.js版本
```

#### 自动补全支持
```bash
# 版本工具补全
devops run vue app --build-version <Tab>
# 输出: node: jdk: java: maven: gradle: volta:

# 版本号补全
devops run vue app --build-version node:<Tab>
# 输出: node:18.12 node:18 node:16 node:lts
```

## 📚 完整文档

所有文档已整理到 [docs/](docs/) 目录中，按阅读顺序编号：

### 🚀 快速开始
- [📖 文档导航](docs/README.md) - 完整的文档中心
- [01-安装指南](docs/01-安装指南/安装指南.md) - 系统安装和环境配置
- [02-快速入门](docs/02-快速入门/快速入门.md) - 5分钟上手指南

### 💻 核心功能
- [03-命令参考](docs/03-命令参考/命令参考.md) - 完整的命令行参考
- [05-部署指南](docs/05-部署指南/部署指南.md) - 应用部署和管理
- [06-模板系统](docs/06-模板系统/模板系统.md) - 模板创建和管理
- [07-工作空间](docs/07-工作空间/工作空间管理.md) - 工作空间配置和使用

### 🔧 高级配置
- [04-配置指南](docs/04-配置指南/配置总览.md) - 配置功能总览
  - [01-版本管理](docs/04-配置指南/01-版本管理.md) - 构建工具版本管理
  - [02-多端口配置](docs/04-配置指南/02-多端口配置.md) - 服务端口配置
  - [03-交互式部署](docs/04-配置指南/03-交互式部署.md) - 引导式部署

### ☸️ Kubernetes & 集成
- [08-Kubernetes](docs/08-Kubernetes/Kubernetes集成.md) - Kubernetes集成
  - [01-命名空间管理](docs/08-Kubernetes/01-命名空间管理.md) - 命名空间配置
  - [02-服务暴露](docs/08-Kubernetes/02-服务暴露.md) - 服务和端口管理
- [09-Harbor集成](docs/09-Harbor集成/Harbor集成.md) - 镜像仓库配置

### 🛠️ 运维支持
- [10-架构设计](docs/10-架构设计/架构设计.md) - 系统架构设计
- [11-故障排除](docs/11-故障排除/故障排除.md) - 问题诊断和解决

### Jenkins集成
直接在任何一台机器上部署jenkins，安装publish over ssh插件，详细说明，后补0.0

如果通过 publish over ssh 远程执行脚本找不到命令，则需要在/$HOME/.bashrc文件中添加环境变量
添加环境变量
```
vim /etc/profile 添加环境变量

DEVOPS_HOME=/项目所在路径/devops/

PATH=$PATH:$DEVOPS_HOME/bin

同时需要添加环境变量到 /root/.bashrc文件中

vim /root/.bashrc

包括 devops java git svn maven gradle npm docker 等等命令到.bashrc中，不然jenkins远程执行找不到命令

```
前置准备工作
```
版本管理工具：git,svn的安装

java项目：安装java,gradle,maven的编译工具 ;node.js项目：安装node.js(选择一种安装)

容器：docker安装 

容器管理平台：docker-swarm ,k8s （选择一个安装运行）
```
配置工作空间
```
devops目录下workspace 中的enabel.conf文件，配置你的工作目录，每一个工作目录互不干涉
```

示例用法 
```
devops run java --git-url http://192.168.10.44/sample/sample.git --java-opts "--profile=dev" sample

devops run java --git-url https://github.com/springframeworkguru/helloworld.git --build-tool maven hello-world

devops run vue --git-url http://192.168.10.44/sample/sample.git  --dockerfile node --template node  sample

devops run vue --svn-url https://192.168.10.253/svn/sample  --dockerfile node --template node --build-env "dev" sample

devops run vue --svn-url https://192.168.10.253/svn/sample  --dockerfile node --template node --build-cmds "npm run build:test" sample

# Kubernetes namespace 支持
devops run java --git-url https://github.com/example/project.git --namespace production my-app

devops run java --git-url https://github.com/example/project.git --namespace dev --build-env dev my-app

# 端口配置支持
devops run java --git-url https://github.com/example/project.git --app-port 8080 --expose-port 30080 my-app

devops run vue --git-url https://github.com/example/frontend.git --expose-port 30081 my-frontend

注意: 最后一个参数，应该为你需要构建项目的那个直接的项目名.
      如果是单级项目，为主项目名，如果为多级项目，为那个直接的子项目名.
      比如java 项目, maven pom中指定的那(如果是多级项目的话)个子项目名

```

## 详细说明
+ 可以构建java项目，或者node的vue项目，更多语言构建支持后续发布
+ 可以选择不同的代码管理工具 --git-url --svn-url,这两个是必传参数
+ 可以选择不同的构建工具，java项目下，可以选择，gradle模式，或者maven模式
+ 可以选择不同的构建平台，docker-swarm,或者k8s,通过配置文件配置config.conf中

## 项目结构
### bin目录，执行文件所在位置
```
build.sh 是脚本所有方法定义的地方 

devops 是脚本执行命令的入口

log.sh 日志脚本 
```
### deploy 部署模板生成的地方
### workspace 工作空间(工作空间的目的，是为了区分，当存在多个构建环境时，每个工作空间配置文件互不影响)
```
enable 激活当前的工作目录的配置文件

meal 示例工作目录,同级的都是示例工作目录 
```
#### 示例工作目录 meal
+ config 当前工作空间的主配置文件
+ dockerfile 存放每一个服务的dockerfile
+ template 存放，不同构建平台的模板文件，支持docker-swarm,k8s等平台

## 命令自动补全

为了提高使用效率，devops支持Tab键自动补全功能。

### 自动安装
运行 `./install.sh` 时会自动配置Tab补全功能，无需额外操作。

### 使用方法
安装后，你可以使用Tab键自动补全devops命令：

```bash
# 显示主命令
devops <Tab>
# 输出: run install-tools template env create

# 显示项目类型
devops run <Tab>
# 输出: java vue golang tomcat

# 显示template子命令
devops template <Tab>
# 输出: list show copy create validate

# 显示可用模板ID（包括全局和workspace模板）
devops template copy <Tab>
# 输出: spring-boot vue-nginx nginx

# 显示template copy选项
devops template copy spring-boot <Tab>
# 输出: --workspace

# 显示workspace列表
devops template copy spring-boot --workspace <Tab>
# 输出: default demo myproject

# 显示所有可用选项
devops run java --<Tab>
# 输出: --build-tool --git-url --git-branch --svn-url --java-opts --dockerfile --template --build-cmds --build-env --workspace --namespace
```

### 手动加载（如果需要）
```bash
source bin/devops-completion.bash
```

### readme.md
+ 项目简介文件
### 注意事项
```
脚本支持远程部署，需要安装except
```
