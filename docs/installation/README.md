# DevOps 安装指南

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

### 本地安装

```bash
# 克隆项目
git clone -b dev https://github.com/edisonlil/devops.git
cd devops

# 执行安装
chmod +x install.sh
./install.sh
```

## 安装内容

安装脚本会自动安装和配置：
- Docker & Docker Compose
- Java JDK 8（默认）
- Maven & Gradle
- Node.js & NPM
- Go 语言环境
- Git 和基础工具

## 系统要求

### 支持的操作系统
- Ubuntu 18.04+
- CentOS 7+
- RHEL 7+
- Debian 9+
- Fedora 30+

### 最低系统要求
- RAM: 2GB+
- 磁盘空间: 5GB+
- 网络连接: 需要访问外网下载依赖

### 权限要求
- 需要 sudo 权限安装系统包
- 建议使用普通用户运行（脚本会自动提升权限）

## 环境工具安装器

DevOps 项目提供了 `install-tools` 功能，可以自动检测和安装开发环境所需的各种工具。

### 基本命令

```bash
# 交互式安装（推荐新手使用）
devops install-tools

# 检查当前环境状态
devops install-tools --check

# 安装所有支持的工具
devops install-tools --all

# 安装指定工具
devops install-tools --tools docker,kubectl,java

# 显示帮助信息
devops install-tools --help
```

### Java版本选择

```bash
# 安装Java 8（默认版本）
devops install-tools --tools java

# 安装Java 11
devops install-tools --tools java --java-version 11

# 安装Java 17
devops install-tools --tools java --java-version 17

# 安装Java 21
devops install-tools --tools java --java-version 21
```

### 组合安装

```bash
# 安装完整的Java开发环境
devops install-tools --tools java,maven,gradle --java-version 8

# 安装容器化开发环境
devops install-tools --tools docker,docker-compose,kubectl

# 安装Node.js开发环境
devops install-tools --tools node,npm,yarn
```

## 支持的工具

| 分类 | 工具 | 说明 |
|------|------|------|
| 基础工具 | git, curl, wget, unzip | 版本控制和文件处理 |
| 容器工具 | docker, docker-compose | 容器化开发和部署 |
| K8s工具 | kubectl, helm | Kubernetes集群管理 |
| Java工具 | java, maven, gradle | Java开发环境 |
| Node工具 | node, npm, yarn | Node.js开发环境 |
| 其他工具 | go, expect | Go语言和自动化工具 |

## SDKMAN! 优势

我们的安装脚本使用 SDKMAN! 来管理 Java 生态系统，相比传统的包管理器安装方式有以下优势：

### 版本管理
- **多版本并存**: 可以同时安装多个 Java 版本（8, 11, 17, 21）
- **快速切换**: 一条命令即可切换不同版本
- **项目隔离**: 不同项目可以使用不同的 Java 版本

### 官方支持
- **直接下载**: 从官方源下载，确保版本纯净
- **及时更新**: 支持最新版本和安全补丁
- **多发行版**: 支持 Oracle、OpenJDK、Temurin 等多种发行版

### 便捷管理
```bash
# 列出可用版本
sdk list java

# 安装特定版本
sdk install java 17.0.9-tem

# 切换版本
sdk use java 11.0.21-tem

# 设置默认版本
sdk default java 11.0.21-tem

# 查看当前版本
sdk current java
```

## 安装后配置

### 1. 重新加载环境变量
```bash
source ~/.bashrc
# 或者重新登录终端
```

### 2. 验证安装
```bash
# 检查 DevOps 工具
devops -h

# 检查各组件版本
docker --version
java -version
mvn -version
node --version
```

### 3. 配置工作空间
```bash
# 编辑工作空间配置
vim workspace/enable

# 配置部署目标（可选）
cp $HOME/.deploy/deploy-target.sample $HOME/.deploy/deploy-target
```

## 故障排除

### 常见问题

1. **权限问题**
   ```bash
   # 确保有sudo权限
   sudo whoami
   ```

2. **网络问题**
   ```bash
   # 检查网络连接
   curl -I https://github.com
   ```

3. **Java版本问题**
   ```bash
   # 检查Java版本
   java -version
   
   # 如果需要切换版本
   sdk use java 8.0.392-tem
   ```

### 获取帮助

如果遇到安装问题，请：
1. 查看详细错误信息
2. 检查系统要求
3. 提交Issue到GitHub仓库

## 相关文档

- [快速入门](../getting-started/README.md)
- [工作空间管理](../workspace/README.md)
- [配置参考](../configuration/README.md)
