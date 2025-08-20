# SDKMAN! 使用示例

本文档展示了使用 SDKMAN! 管理 Java 环境的实际场景和优势。

## 🎯 为什么选择 SDKMAN!

### 传统方式的问题
```bash
# 传统包管理器安装的问题
sudo apt-get install openjdk-11-jdk  # 只能安装一个版本
sudo apt-get install maven          # 版本可能过旧
sudo apt-get install gradle         # 依赖系统包，更新困难

# 问题：
# 1. 无法同时安装多个 Java 版本
# 2. 版本切换困难
# 3. 系统包版本滞后
# 4. 不同项目需要不同版本时很麻烦
```

### SDKMAN! 的解决方案
```bash
# 一次安装，多版本管理
sdk install java 8.0.392-tem    # Java 8
sdk install java 11.0.21-tem    # Java 11
sdk install java 17.0.9-tem     # Java 17
sdk install java 21.0.1-tem     # Java 21

# 快速切换版本
sdk use java 11.0.21-tem        # 临时切换到 Java 11
sdk default java 17.0.9-tem     # 设置 Java 17 为默认

# 最新版本的构建工具
sdk install maven               # 最新版 Maven
sdk install gradle             # 最新版 Gradle
```

## 🚀 实际使用场景

### 场景1：多项目开发
```bash
# 项目A：老项目使用 Java 8
cd project-a
sdk use java 8.0.392-tem
java -version  # 显示 Java 8

# 项目B：新项目使用 Java 17
cd project-b
sdk use java 17.0.9-tem
java -version  # 显示 Java 17

# 项目C：最新项目使用 Java 21
cd project-c
sdk use java 21.0.1-tem
java -version  # 显示 Java 21
```

### 场景2：项目级别版本锁定
```bash
# 在项目根目录创建 .sdkmanrc 文件
cd my-project
sdk env init

# 编辑 .sdkmanrc 文件
echo "java=11.0.21-tem" > .sdkmanrc
echo "maven=3.9.5" >> .sdkmanrc
echo "gradle=8.4" >> .sdkmanrc

# 团队成员进入项目目录时自动切换版本
cd my-project
sdk env  # 自动切换到项目指定的版本
```

### 场景3：CI/CD 环境
```bash
# Dockerfile 中使用 SDKMAN!
FROM ubuntu:20.04

# 安装 SDKMAN!
RUN curl -s "https://get.sdkman.io" | bash

# 安装特定版本的工具
RUN bash -c "source ~/.sdkman/bin/sdkman-init.sh && \
    sdk install java 11.0.21-tem && \
    sdk install maven 3.9.5 && \
    sdk install gradle 8.4"

# 设置环境变量
ENV JAVA_HOME="/root/.sdkman/candidates/java/current"
ENV PATH="$PATH:/root/.sdkman/candidates/java/current/bin"
```

## 📋 常用命令速查

### 查看和安装
```bash
# 列出所有可用的 SDK
sdk list

# 列出 Java 的所有版本
sdk list java

# 安装特定版本
sdk install java 17.0.9-tem
sdk install maven 3.9.5
sdk install gradle 8.4

# 安装最新版本
sdk install java
sdk install maven
sdk install gradle
```

### 版本管理
```bash
# 查看已安装的版本
sdk list java | grep installed

# 查看当前使用的版本
sdk current java
sdk current maven
sdk current gradle

# 临时切换版本（仅当前会话）
sdk use java 11.0.21-tem

# 设置默认版本（全局）
sdk default java 17.0.9-tem

# 卸载版本
sdk uninstall java 8.0.392-tem
```

### 环境管理
```bash
# 在项目中初始化环境文件
sdk env init

# 根据 .sdkmanrc 切换环境
sdk env

# 清除当前会话的版本设置
sdk env clear
```

### 维护和更新
```bash
# 更新 SDKMAN! 本身
sdk selfupdate

# 更新候选版本列表
sdk update

# 升级已安装的版本
sdk upgrade java

# 清理旧版本
sdk flush archives
sdk flush temp
```

## 🔧 高级用法

### 1. 自定义安装路径
```bash
# SDKMAN! 默认安装在 ~/.sdkman
# 可以通过环境变量自定义
export SDKMAN_DIR="/opt/sdkman"
curl -s "https://get.sdkman.io" | bash
```

### 2. 离线模式
```bash
# 启用离线模式（不检查更新）
sdk config
# 设置 sdkman_auto_answer=true
# 设置 sdkman_selfupdate_enable=false
```

### 3. 批量安装脚本
```bash
#!/bin/bash
# install-java-stack.sh

source ~/.sdkman/bin/sdkman-init.sh

# 安装多个 Java 版本
sdk install java 11.0.21-tem
sdk install java 17.0.9-tem
sdk install java 21.0.1-tem

# 安装构建工具
sdk install maven
sdk install gradle

# 安装其他工具
sdk install kotlin
sdk install scala
sdk install groovy

# 设置默认版本
sdk default java 17.0.9-tem

echo "Java 开发环境安装完成！"
```

### 4. 与 IDE 集成
```bash
# IntelliJ IDEA
# File -> Project Structure -> Project Settings -> Project
# 选择 SDKMAN! 安装的 JDK 路径：~/.sdkman/candidates/java/17.0.9-tem

# VS Code
# 在 settings.json 中配置
{
    "java.home": "/home/user/.sdkman/candidates/java/17.0.9-tem"
}

# Eclipse
# Window -> Preferences -> Java -> Installed JREs
# 添加 SDKMAN! 安装的 JDK 路径
```

## 🎯 最佳实践

### 1. 项目配置
- 每个项目都应该有 `.sdkmanrc` 文件
- 在 README 中说明所需的 Java 版本
- CI/CD 脚本中使用相同的版本

### 2. 团队协作
- 统一使用 SDKMAN! 管理 Java 环境
- 共享 `.sdkmanrc` 配置文件
- 在项目文档中说明环境要求

### 3. 版本选择
- LTS 版本优先：Java 8, 11, 17, 21
- 生产环境使用稳定版本
- 开发环境可以尝试最新版本

### 4. 定期维护
- 定期更新 SDKMAN! 本身
- 清理不再使用的版本
- 关注安全更新

## 🔍 故障排除

### 常见问题
```bash
# 1. sdk 命令不可用
source ~/.sdkman/bin/sdkman-init.sh

# 2. 版本切换不生效
sdk flush archives
sdk flush temp

# 3. 网络问题
sdk config
# 设置代理或离线模式

# 4. 权限问题
chmod +x ~/.sdkman/bin/sdkman-init.sh
```

### 环境检查
```bash
# 检查 SDKMAN! 状态
sdk version
sdk current

# 检查环境变量
echo $JAVA_HOME
echo $PATH

# 重新初始化
source ~/.sdkman/bin/sdkman-init.sh
```

---

通过 SDKMAN!，Java 环境管理变得简单而强大，特别适合需要在多个项目间切换不同 Java 版本的开发场景！
