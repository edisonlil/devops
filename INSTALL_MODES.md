# DevOps 安装模式说明

移除快速安装后，我们现在提供三种清晰明确的安装模式，每种模式都有明确的用途和适用场景。

## 📊 三种安装模式对比

| 特性 | 标准安装 | 完整安装 | 脚本专用 |
|------|---------|---------|---------|
| **Java 环境** | ✅ SDKMAN! + JDK 11,17,21 | ✅ SDKMAN! + JDK 11,17,21 | ❌ |
| **构建工具** | ✅ Maven + Gradle | ✅ Maven + Gradle | ❌ |
| **容器工具** | ✅ Docker + Compose | ✅ Docker + Compose | ❌ |
| **前端环境** | ❌ | ✅ Node.js + NPM | ❌ |
| **Go 语言** | ❌ | ✅ Go 1.21+ | ❌ |
| **DevOps 脚本** | ✅ | ✅ | ✅ |
| **基础工具** | ✅ curl, wget, git | ✅ curl, wget, git | ✅ |
| **安装时间** | ~10分钟 | ~20分钟 | ~1分钟 |
| **磁盘占用** | ~3GB | ~5GB | ~20MB |

## 🎯 详细说明

### 1. 标准安装（默认推荐）

```bash
./install.sh
# 或
make install
```

**包含组件:**
- ✅ SDKMAN! (Java 版本管理器)
- ✅ Java JDK (11, 17, 21 多版本)
- ✅ Maven (最新版)
- ✅ Gradle (最新版)
- ✅ Docker & Docker Compose
- ✅ DevOps 自动化脚本
- ✅ 基础工具 (curl, wget, git)

**适用场景:**
- ☕ Java 后端开发
- 🐳 容器化应用开发
- 🏢 企业级 Java 项目
- 🔧 微服务架构开发
- 📦 Spring Boot 应用

**优点:**
- 覆盖 Java 开发的核心需求
- 安装速度适中
- 功能完整但不冗余
- 适合大多数 Java 开发者

### 2. 完整安装（全功能）

```bash
./install.sh --full
# 或
make full
```

**包含组件:**
- ✅ 标准安装的所有组件
- ✅ Node.js & NPM (前端开发)
- ✅ Go 语言环境
- ✅ 支持更多项目类型

**适用场景:**
- 🌐 全栈开发 (Java + 前端)
- 📱 现代 Web 应用开发
- 🔄 微服务 + 前端项目
- 👥 多技术栈团队
- 🚀 云原生应用开发

**优点:**
- 支持最多的开发场景
- 一次安装解决所有需求
- 适合学习和实验环境

**缺点:**
- 安装时间较长
- 占用磁盘空间较大

### 3. 脚本专用（轻量高效）

```bash
./install.sh --script-only
# 或
make script-only
```

**包含组件:**
- ✅ DevOps 自动化脚本
- ✅ 基础工具 (curl, wget, git)
- ✅ 环境变量配置
- ❌ 不安装任何开发环境

**适用场景:**
- 🏢 已配置好的企业服务器
- 🐳 Docker 容器中使用
- ☁️ 云主机 (预装开发工具)
- 🔄 CI/CD 流水线
- 👨‍💼 运维和部署环境

**优点:**
- 极速安装 (~1分钟)
- 占用空间最小
- 专注核心功能
- 适合生产环境

**前提条件:**
- 目标环境已安装 Java
- 目标环境已安装 Docker
- 目标环境已安装构建工具

## 🤔 如何选择？

### 决策树

```
你的环境情况？
├─ 全新环境
│  ├─ 只做 Java 开发 → 标准安装
│  └─ 需要多语言开发 → 完整安装
└─ 已有开发环境
   └─ 只需要 DevOps 脚本 → 脚本专用
```

### 具体建议

**🆕 新手开发者:**
```bash
make install  # 标准安装，满足 Java 开发需求
```

**🌐 全栈开发者:**
```bash
make full     # 完整安装，支持前后端开发
```

**🏢 企业环境/运维:**
```bash
make script-only  # 脚本专用，轻量高效
```

**🎓 学习环境:**
```bash
make full     # 完整安装，可以尝试各种技术
```

## 🚀 使用示例

### 标准安装使用场景
```bash
# 安装
make install

# Java 项目构建
devops run java \
  --git-url https://github.com/example/spring-boot-app.git \
  --build-tool maven \
  my-spring-app

# 容器化部署
devops run java \
  --git-url https://github.com/example/microservice.git \
  --dockerfile java \
  --template k8s \
  my-microservice
```

### 完整安装使用场景
```bash
# 安装
make full

# Java 后端
devops run java \
  --git-url https://github.com/example/api-server.git \
  --build-tool gradle \
  api-server

# Vue 前端
devops run vue \
  --git-url https://github.com/example/vue-frontend.git \
  --dockerfile node \
  frontend-app

# Go 微服务
devops run golang \
  --git-url https://github.com/example/go-service.git \
  go-service
```

### 脚本专用使用场景
```bash
# 安装
make script-only

# 在已有环境中使用（确保已安装 Java、Docker 等）
java -version    # 确认 Java 可用
docker --version # 确认 Docker 可用

# 直接使用 DevOps 脚本
devops run java \
  --git-url https://github.com/example/existing-project.git \
  --build-tool maven \
  existing-project
```

## 📈 性能对比

### 安装时间对比
- **脚本专用**: ~1分钟 ⚡
- **标准安装**: ~10分钟 🚀
- **完整安装**: ~20分钟 📦

### 磁盘占用对比
- **脚本专用**: ~20MB 💾
- **标准安装**: ~3GB 💿
- **完整安装**: ~5GB 📀

### 网络流量对比
- **脚本专用**: ~10MB 📶
- **标准安装**: ~1GB 📡
- **完整安装**: ~2GB 🌐

## 💡 最佳实践

### 开发环境
```bash
# 个人开发机器
make install      # 标准安装，满足日常需求

# 全栈开发机器
make full         # 完整安装，支持多技术栈
```

### 生产环境
```bash
# 应用服务器（已有环境）
make script-only  # 仅安装脚本，轻量部署

# CI/CD 环境
curl -fsSL https://raw.githubusercontent.com/your-repo/devops/main/install.sh | bash -s -- --script-only
```

### 容器环境
```dockerfile
# 基于已有开发环境的镜像
FROM openjdk:11-jdk

# 仅安装 DevOps 脚本
RUN curl -fsSL https://raw.githubusercontent.com/your-repo/devops/main/install.sh | bash -s -- --script-only

WORKDIR /app
```

---

**总结**: 三种模式各有特色，标准安装适合大多数用户，完整安装适合全栈开发，脚本专用适合已有环境。选择合适的模式可以大大提升开发效率！
