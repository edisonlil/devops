# 版本管理功能使用指南

## 概述

DevOps工具链现在支持在构建时指定环境版本，无需增加额外的操作复杂度。通过扩展现有的 `--build-env` 参数，您可以轻松指定Node.js、Java、Maven、Gradle、Volta等工具的版本。

## 使用方法

### 基本语法

```bash
devops <项目类型> <项目名称> --build-env "工具:版本"
```

### Vue项目示例

```bash
# 指定Node.js版本
devops vue my-vue-app --build-env "node:18.12"

# 指定Node.js版本和构建环境
devops vue my-vue-app --build-env "node:18.12,prod"

# 指定Volta版本
devops vue my-vue-app --build-env "volta:18.12"

# 同时指定Node.js和Volta版本
devops vue my-vue-app --build-env "node:18.12,volta:18.12"

# 指定版本和构建环境
devops vue my-vue-app --build-env "volta:18.12,prod"

# 使用自定义构建命令
devops vue my-vue-app --build-env "node:18.12" --build-cmds "npm run build:production"
```

### Java项目示例

```bash
# 指定JDK版本
devops java my-java-app --build-env "jdk:17"

# 指定Maven版本
devops java my-java-app --build-env "maven:3.9.3"

# 同时指定JDK和Maven版本
devops java my-java-app --build-env "jdk:17,maven:3.9.3"

# 指定Gradle版本
devops java my-java-app --build-tool gradle --build-env "gradle:8.0"

# 组合使用
devops java my-java-app --build-tool maven --build-env "jdk:17,maven:3.9.3" --java-opts "-Xmx2g"
```

## 支持的版本管理器

### Node.js
- **nvm** (Node Version Manager)
- **fnm** (Fast Node Manager)
- **n** (Node.js version manager)
- **volta** (Volta - JavaScript Tool Manager)

### Java
- **sdkman** (Software Development Kit Manager)

### Maven
- **sdkman** (Software Development Kit Manager)

### Gradle
- **sdkman** (Software Development Kit Manager)

### Volta
- **volta** (Volta - JavaScript Tool Manager)

## 版本格式

### Node.js版本
```bash
node:18.12    # 具体版本
node:18       # 主版本
node:lts      # LTS版本
```

### Java版本
```bash
jdk:17        # JDK 17
java:17       # Java 17 (与jdk:17相同)
jdk:17.0.2    # 具体版本
```

### Maven版本
```bash
maven:3.9.3   # 具体版本
maven:3.9     # 主版本
```

### Gradle版本
```bash
gradle:8.0    # 具体版本
gradle:8      # 主版本
```

### Volta版本
```bash
volta:18.12   # Node.js版本（通过Volta管理）
volta:18      # 主版本
volta:lts     # LTS版本
```

## 工作原理

1. **版本检测**: 系统会自动检测可用的版本管理器
2. **版本切换**: 如果指定版本未安装，会自动安装
3. **回退机制**: 如果版本管理器不可用，会使用系统默认版本并给出警告
4. **兼容性**: 保持与现有 `--build-env` 参数的完全兼容

## 最佳实践

### 1. 项目版本锁定
```bash
# 在CI/CD中使用固定版本
devops vue my-app --build-env "node:18.12.0"
devops vue my-app --build-env "volta:18.12.0"
devops java my-app --build-env "jdk:17.0.2,maven:3.9.3"
```

### 2. 团队统一版本
```bash
# 团队统一使用LTS版本
devops vue my-app --build-env "node:lts"
devops vue my-app --build-env "volta:lts"
devops java my-app --build-env "jdk:17"
```

### 3. 多环境部署
```bash
# 开发环境
devops vue my-app --build-env "node:18,dev"
devops vue my-app --build-env "volta:18,dev"

# 生产环境
devops vue my-app --build-env "node:18,prod"
devops vue my-app --build-env "volta:18,prod"
```

## 故障排除

### 版本管理器未找到
如果系统提示"未找到版本管理器"，请安装相应的版本管理器：

```bash
# 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装volta
curl https://get.volta.sh | bash

# 安装sdkman
curl -s "https://get.sdkman.io" | bash
```

### 版本安装失败
如果版本安装失败，系统会自动回退到默认版本并继续构建。

### 查看当前版本
使用测试脚本查看当前环境版本：
```bash
./test_version_manager.sh
```

## 注意事项

1. **性能影响**: 版本切换会增加少量构建时间
2. **网络依赖**: 首次安装版本需要网络连接
3. **权限要求**: 某些版本管理器可能需要特定权限
4. **兼容性**: 确保指定的版本与项目兼容
5. **Volta特性**: Volta会自动管理Node.js和npm版本，无需单独指定npm版本

## 示例项目配置

### package.json (Vue项目)
```json
{
  "name": "my-vue-app",
  "engines": {
    "node": ">=18.12.0"
  }
}
```

### package.json (使用Volta)
```json
{
  "name": "my-vue-app",
  "volta": {
    "node": "18.12.0"
  }
}
```

### pom.xml (Java项目)
```xml
<properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
</properties>
```

### build.gradle (Gradle项目)
```gradle
sourceCompatibility = '17'
targetCompatibility = '17'
```
