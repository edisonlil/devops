# DevOps 一键安装指南

本项目提供了两个安装脚本，帮助您快速部署 DevOps 环境。

## 安装脚本说明

### 1. install.sh - 完整安装脚本
功能最全面的安装脚本，包含详细的系统检测和组件安装。

**特性:**
- 自动检测操作系统类型
- 完整的依赖检查和安装
- 详细的安装日志
- 全面的错误处理
- 安装验证

**支持的组件:**
- Docker & Docker Compose
- SDKMAN! (Java 生态系统管理器)
- Java JDK (多版本支持: 11, 17, 21)
- Maven (通过 SDKMAN!)
- Gradle (通过 SDKMAN!)
- Node.js (LTS)
- Go 1.21.4
- Git 和基础工具

### 2. quick-install.sh - 快速安装脚本
轻量级的快速安装脚本，适合快速部署。

**特性:**
- 快速安装核心组件
- 支持多种安装模式
- 简洁的用户界面
- 基本的系统检查

**安装模式:**
- `--minimal`: 最小化安装（仅基础工具）
- `--full`: 完整安装（所有组件）
- 默认: 标准安装（核心组件）

## 使用方法

### 方法一：完整安装（推荐）

```bash
# 下载并运行完整安装脚本
chmod +x install.sh
./install.sh
```

### 方法二：快速安装

```bash
# 标准安装
chmod +x quick-install.sh
./quick-install.sh

# 最小化安装
./quick-install.sh --minimal

# 完整安装
./quick-install.sh --full
```

### 方法三：一键安装（推荐新手）

```bash
# 直接运行（会自动选择合适的脚本）
curl -fsSL https://raw.githubusercontent.com/your-repo/devops/main/quick-install.sh | bash
```

### 方法四：仅安装 SDKMAN! 和 Java 环境

```bash
# 专门的 SDKMAN! 安装脚本
chmod +x install-sdkman.sh

# 标准安装（Java + Maven + Gradle）
./install-sdkman.sh

# 仅安装 Java
./install-sdkman.sh --java-only

# 交互式安装（可选择额外工具）
./install-sdkman.sh --interactive
```

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
vim $HOME/.deploy/deploy-target
```

## 快速开始

### Java 项目构建
```bash
devops run java \
  --git-url https://github.com/example/spring-boot-app.git \
  --build-tool maven \
  --java-opts "--profile=dev" \
  my-spring-app
```

### Vue 项目构建
```bash
devops run vue \
  --git-url https://github.com/example/vue-app.git \
  --dockerfile node \
  --template node \
  --build-env "production" \
  my-vue-app
```

### Go 项目构建
```bash
devops run golang \
  --git-url https://github.com/example/go-app.git \
  my-go-app
```

## 故障排除

### 常见问题

1. **权限错误**
   ```bash
   # 确保脚本有执行权限
   chmod +x install.sh quick-install.sh
   ```

2. **网络连接问题**
   ```bash
   # 检查网络连接
   ping google.com
   
   # 配置代理（如需要）
   export http_proxy=http://proxy:port
   export https_proxy=http://proxy:port
   ```

3. **包管理器问题**
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   
   # CentOS/RHEL
   sudo yum update
   ```

4. **Docker 权限问题**
   ```bash
   # 将用户添加到 docker 组
   sudo usermod -aG docker $USER
   # 重新登录或运行
   newgrp docker
   ```

### 卸载

如需卸载，可以运行：
```bash
# 移除环境变量配置
sed -i '/DEVOPS_HOME/d' ~/.bashrc
sed -i '/DevOps Environment/d' ~/.bashrc

# 删除配置目录
rm -rf $HOME/.devops
rm -rf $HOME/.deploy

# 移除系统环境变量文件（如果存在）
sudo rm -f /etc/profile.d/devops.sh
```

## 支持与反馈

如果您在安装过程中遇到问题，请：

1. 检查系统日志和错误信息
2. 确认系统满足最低要求
3. 查看本文档的故障排除部分
4. 提交 Issue 到项目仓库

## 更新日志

- v1.0.0: 初始版本，支持基础组件安装
- 计划中: 支持更多编程语言和工具链

---

**作者:** edison, srillia  
**许可证:** 请查看 LICENSE.txt 文件
