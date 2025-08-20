# DevOps 环境工具安装器

## 概述

DevOps 项目新增了 `install-tools` 功能，可以自动检测和安装开发环境所需的各种工具。这个功能特别适用于在新的服务器或开发环境中快速搭建完整的DevOps工具链。

## 功能特性

- 🔍 **智能检测**: 自动检测当前环境中已安装和缺失的工具
- 🎯 **选择性安装**: 支持安装指定的工具，避免不必要的安装
- 🔧 **多版本支持**: 支持选择不同版本的Java (8, 11, 17, 21)
- 🌈 **彩色输出**: 清晰的状态提示和进度显示
- 📦 **智能包管理**: 自动检测操作系统并使用合适的包管理器
- ⚡ **跳过已安装**: 自动跳过已安装的工具，节省时间

## 使用方法

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

# 安装Java 8（显式指定）
devops install-tools --tools java --java-version 8

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

### 基础工具
- `git` - 版本控制系统
- `curl` - 命令行HTTP客户端
- `wget` - 文件下载工具
- `unzip` - 解压缩工具

### 容器工具
- `docker` - 容器运行时
- `docker-compose` - 容器编排工具

### Kubernetes工具
- `kubectl` - Kubernetes命令行工具
- `helm` - Kubernetes包管理器

### Java工具
- `java` - Java运行时环境和开发工具包
- `maven` - Java项目管理工具
- `gradle` - Java构建工具

### Node.js工具
- `node` - Node.js运行时
- `npm` - Node.js包管理器
- `yarn` - 替代的Node.js包管理器

### 其他工具
- `go` - Go语言编译器
- `expect` - 自动化交互工具（远程部署需要）

## 安装策略

### Java工具链
- 优先使用 SDKMAN! 进行安装，提供更好的版本管理
- 备用方案使用系统包管理器
- 默认安装JDK 8，兼容性最佳

### 容器工具
- Docker使用官方安装脚本
- 自动配置用户权限和服务启动

### Kubernetes工具
- kubectl从官方仓库下载最新稳定版
- Helm使用官方安装脚本

### Node.js工具
- 使用NodeSource仓库安装LTS版本
- Yarn通过npm全局安装

## 示例场景

### 场景1：新服务器环境搭建
```bash
# 检查当前环境
devops install-tools --check

# 交互式安装缺失工具
devops install-tools
```

### 场景2：Java开发环境
```bash
# 安装完整Java开发环境（JDK 8）
devops install-tools --tools java,maven,gradle,git --java-version 8
```

### 场景3：容器化部署环境
```bash
# 安装容器和Kubernetes工具
devops install-tools --tools docker,docker-compose,kubectl,helm
```

### 场景4：Node.js开发环境
```bash
# 安装Node.js开发工具
devops install-tools --tools node,npm,yarn,git
```

## 注意事项

1. **权限要求**: 某些工具安装需要sudo权限
2. **网络要求**: 需要稳定的网络连接下载安装包
3. **系统兼容性**: 主要支持Linux系统（Ubuntu、CentOS、RHEL等）
4. **Java版本**: 默认安装JDK 8，如需其他版本请明确指定
5. **环境变量**: 安装完成后可能需要重新加载环境变量或重新登录

## 故障排除

### 常见问题

1. **权限不足**
   ```bash
   # 确保有sudo权限
   sudo -v
   ```

2. **网络连接问题**
   ```bash
   # 测试网络连接
   curl -I https://get.docker.com
   ```

3. **包管理器问题**
   ```bash
   # 更新包管理器
   sudo apt-get update  # Ubuntu/Debian
   sudo yum update      # CentOS/RHEL
   ```

4. **SDKMAN!初始化问题**
   ```bash
   # 手动初始化SDKMAN!
   source "$HOME/.sdkman/bin/sdkman-init.sh"
   ```

### 获取帮助

如果遇到问题，可以：
1. 运行 `devops install-tools --help` 查看帮助
2. 运行 `devops install-tools --check` 检查环境状态
3. 查看安装日志中的错误信息
4. 手动安装失败的工具

## 更新日志

### v1.0.0
- 初始版本发布
- 支持15种常用开发工具
- 支持Java多版本选择
- 支持交互式和批量安装模式
