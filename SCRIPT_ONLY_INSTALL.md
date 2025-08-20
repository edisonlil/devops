# DevOps 脚本专用安装指南

如果你已经有了完整的开发环境（Java、Docker、Maven等），只需要安装 DevOps 脚本本身，这个指南就是为你准备的。

## 🎯 适用场景

### 适合脚本专用安装的用户
- ✅ 已经安装了 Java 开发环境
- ✅ 已经安装了 Docker 和容器工具
- ✅ 已经安装了 Maven/Gradle 构建工具
- ✅ 只需要 DevOps 自动化脚本功能
- ✅ 在已配置好的服务器上部署
- ✅ 使用容器化开发环境

### 不适合的场景
- ❌ 全新的开发环境
- ❌ 需要安装 Java/Docker 等工具
- ❌ 第一次接触 DevOps 工具

## 🚀 安装方法

### 方法一：使用 Makefile（推荐）
```bash
# 克隆项目
git clone <repository-url>
cd devops

# 脚本专用安装
make script-only

# 或者使用别名
make minimal
```

### 方法二：直接运行安装脚本
```bash
# 完整安装脚本的最小模式
./install.sh --script-only
# 或
./install.sh --minimal

# 快速安装脚本的最小模式
./quick-install.sh --script-only
# 或
./quick-install.sh --minimal
```

### 方法三：在线安装
```bash
# 在线脚本专用安装
curl -fsSL https://raw.githubusercontent.com/your-repo/devops/main/install.sh | bash -s -- --script-only
```

## 📦 安装内容

### 会安装的组件
- ✅ DevOps 核心脚本 (`bin/devops` 等)
- ✅ 基础工具 (curl, wget, git)
- ✅ 环境变量配置
- ✅ 工作空间配置
- ✅ 用户配置目录

### 不会安装的组件
- ❌ Java JDK
- ❌ Maven/Gradle
- ❌ Docker
- ❌ Node.js
- ❌ Go 语言环境
- ❌ SDKMAN!

## 🔧 安装后配置

### 1. 重新加载环境变量
```bash
source ~/.bashrc
# 或重新登录终端
```

### 2. 验证安装
```bash
# 检查 DevOps 命令
devops -h

# 检查环境变量
echo $DEVOPS_HOME
```

### 3. 配置工作空间
```bash
# 编辑工作空间配置
vim workspace/enable

# 配置部署目标（如需要）
cp $HOME/.deploy/deploy-target.sample $HOME/.deploy/deploy-target
vim $HOME/.deploy/deploy-target
```

## ✅ 环境要求检查

在使用脚本专用安装前，请确保你的环境已经具备以下条件：

### 必需的工具
```bash
# 检查 Git
git --version

# 检查 Docker（如果需要容器化部署）
docker --version

# 检查 Java（如果需要 Java 项目构建）
java -version

# 检查构建工具（根据项目需要）
mvn -version    # Maven 项目
gradle -version # Gradle 项目
node --version  # Node.js 项目
go version      # Go 项目
```

### 权限要求
```bash
# 检查 Docker 权限（如果使用 Docker）
docker ps

# 检查 sudo 权限（安装基础工具时需要）
sudo echo "权限检查通过"
```

## 🎯 使用示例

### Java 项目构建
```bash
# 确保环境中有 Java 和 Maven
java -version
mvn -version

# 使用 DevOps 脚本构建
devops run java \
  --git-url https://github.com/example/spring-boot-app.git \
  --build-tool maven \
  --java-opts "--profile=prod" \
  my-spring-app
```

### Vue 项目构建
```bash
# 确保环境中有 Node.js 和 Docker
node --version
docker --version

# 使用 DevOps 脚本构建
devops run vue \
  --git-url https://github.com/example/vue-app.git \
  --dockerfile node \
  --template node \
  my-vue-app
```

### Go 项目构建
```bash
# 确保环境中有 Go 和 Docker
go version
docker --version

# 使用 DevOps 脚本构建
devops run golang \
  --git-url https://github.com/example/go-app.git \
  my-go-app
```

## 🔍 故障排除

### 常见问题

#### 1. devops 命令不可用
```bash
# 检查环境变量
echo $DEVOPS_HOME
echo $PATH | grep devops

# 重新加载环境变量
source ~/.bashrc

# 手动添加到 PATH（临时）
export PATH=$PATH:$(pwd)/bin
```

#### 2. 权限问题
```bash
# 检查脚本权限
ls -la bin/devops

# 修复权限
chmod +x bin/*
```

#### 3. 依赖工具缺失
```bash
# 检查必需的基础工具
which curl wget git

# 手动安装缺失的工具
sudo apt-get install curl wget git  # Ubuntu/Debian
sudo yum install curl wget git      # CentOS/RHEL
```

#### 4. 构建失败
```bash
# 检查目标环境的工具
java -version    # Java 项目需要
docker --version # 容器化部署需要
mvn -version     # Maven 项目需要

# 如果缺少工具，运行完整安装
./install.sh     # 完整安装所有工具
```

## 🔄 升级到完整安装

如果后续需要安装完整的开发环境：

```bash
# 方法一：运行完整安装脚本
./install.sh

# 方法二：使用 Makefile
make install

# 方法三：安装特定组件
make sdkman      # 仅安装 Java 环境
make full        # 完整安装
```

## 📊 对比表格

| 安装模式 | 安装时间 | 磁盘占用 | 适用场景 |
|---------|---------|---------|---------|
| 脚本专用 | ~1分钟 | ~10MB | 已有开发环境 |
| 标准安装 | ~10分钟 | ~2GB | 一般用户 |
| 完整安装 | ~20分钟 | ~5GB | 全新环境 |

## 💡 最佳实践

### 1. 容器化环境
```dockerfile
# 在 Dockerfile 中使用脚本专用安装
FROM openjdk:11-jdk

# 安装 DevOps 脚本
RUN curl -fsSL https://raw.githubusercontent.com/your-repo/devops/main/install.sh | bash -s -- --script-only

# 设置工作目录
WORKDIR /app
```

### 2. CI/CD 环境
```yaml
# GitHub Actions 示例
- name: Install DevOps Scripts
  run: |
    curl -fsSL https://raw.githubusercontent.com/your-repo/devops/main/install.sh | bash -s -- --script-only
    source ~/.bashrc
```

### 3. 服务器部署
```bash
# 在已配置的服务器上
ssh user@server
git clone <repository-url>
cd devops
make script-only
```

---

**总结**: 脚本专用安装是为已有开发环境的用户提供的轻量级选项，快速、简洁、高效！
