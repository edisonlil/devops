# Vue 项目配置指南

DevOps 工具为 Vue 项目提供了专门的配置选项，支持 npm 镜像库配置和认证管理。

## 🎯 配置概述

Vue 项目配置主要包括：
- **npm 镜像库配置** - 指定 npm 包下载源
- **认证信息配置** - 私有镜像库的认证管理
- **构建环境配置** - 不同环境的构建参数

## 📝 配置项说明

### 工作空间配置

在 `workspace/<workspace-name>/config` 文件中添加以下配置：

```bash
# Vue 项目 npm 镜像库配置
BUILD_VUE_REGISTRY="https://registry.npmmirror.com"
BUILD_VUE_REGISTRY_AUTH="username:password"
```

#### 配置项详解

| 配置项 | 说明 | 示例 | 默认值 |
|--------|------|------|--------|
| `BUILD_VUE_REGISTRY` | npm 镜像库地址 | `"https://registry.npmmirror.com"` | 官方 npm 源 |
| `BUILD_VUE_REGISTRY_AUTH` | 认证信息 | `"username:password"` 或 `"token"` | 无 |

## 🔧 配置示例

### 1. 使用国内镜像源

```bash
# workspace/my-project/config
BUILD_VUE_REGISTRY="https://registry.npmmirror.com"
```

### 2. 使用私有镜像库

```bash
# workspace/my-project/config
BUILD_VUE_REGISTRY="https://npm.company.com"
BUILD_VUE_REGISTRY_AUTH="myuser:mypassword"
```

### 3. 使用 Token 认证

```bash
# workspace/my-project/config
BUILD_VUE_REGISTRY="https://npm.company.com"
BUILD_VUE_REGISTRY_AUTH="npm_xxxxxxxxxxxxxxxx"
```

## 🚀 使用方法

### 基本使用

```bash
# 使用工作空间配置的镜像库
devops run vue my-app --git-url https://github.com/user/vue-app.git
```

### 命令行覆盖

```bash
# 临时使用其他镜像库（会覆盖工作空间配置）
devops run vue my-app \
  --git-url https://github.com/user/vue-app.git \
  --build-cmds "npm config set registry https://registry.npm.taobao.org && npm install && npm run build"
```

## 🌍 常用镜像源

### 国内镜像源

| 镜像源 | 地址 | 说明 |
|--------|------|------|
| 淘宝镜像 | `https://registry.npm.taobao.org` | 淘宝 NPM 镜像 |
| 华为镜像 | `https://mirrors.huaweicloud.com/repository/npm/` | 华为云 NPM 镜像 |
| 腾讯镜像 | `https://mirrors.cloud.tencent.com/npm/` | 腾讯云 NPM 镜像 |
| 阿里镜像 | `https://registry.npmmirror.com` | 阿里云 NPM 镜像 |

### 企业私有镜像源

```bash
# 公司内部镜像源
BUILD_VUE_REGISTRY="https://npm.company.com"
BUILD_VUE_REGISTRY_AUTH="username:password"
```

## 🔐 认证配置

### 用户名密码认证

```bash
# 格式：username:password
BUILD_VUE_REGISTRY_AUTH="myuser:mypassword"
```

### Token 认证

```bash
# 格式：token字符串
BUILD_VUE_REGISTRY_AUTH="npm_xxxxxxxxxxxxxxxx"
```

### 获取认证信息

#### 1. 从现有 npm 配置获取

```bash
# 查看当前 npm 配置
npm config list

# 查看认证信息
npm config get //registry.npmjs.org/:_authToken
```

#### 2. 从 .npmrc 文件获取

```bash
# 查看 .npmrc 文件
cat ~/.npmrc
```

## 🛠️ 配置验证

### 检查配置生效

```bash
# 运行 Vue 项目构建
devops run vue my-app --git-url https://github.com/user/vue-app.git

# 查看构建日志中的镜像库信息
# 应该看到类似输出：
# "使用配置的 npm 镜像库: https://registry.npmmirror.com"
```

### 测试镜像库连接

```bash
# 手动测试镜像库连接
npm config set registry https://registry.npmmirror.com
npm ping
```

## 🔄 环境隔离

### 不同环境使用不同镜像源

```bash
# 开发环境 - 使用国内镜像源
# workspace/dev/config
BUILD_VUE_REGISTRY="https://registry.npmmirror.com"

# 生产环境 - 使用官方镜像源
# workspace/prod/config
BUILD_VUE_REGISTRY="https://registry.npmjs.org"
```

## 💡 最佳实践

### 1. 镜像源选择

- **开发环境**：使用国内镜像源，提高下载速度
- **生产环境**：使用官方镜像源，确保稳定性
- **企业环境**：使用私有镜像源，确保安全性

### 2. 认证管理

- 不要在代码中硬编码认证信息
- 使用环境变量或配置文件管理认证信息
- 定期更新认证 Token

### 3. 配置文档化

```bash
# 在 workspace 中添加配置说明
# workspace/my-project/README.md

## Vue 项目配置

本项目使用阿里云 npm 镜像源：
- 镜像源：https://registry.npmmirror.com
- 认证方式：无（公开镜像源）

如需使用私有镜像源，请联系管理员配置认证信息。
```

## 🔗 相关文档

- [版本管理](01-版本管理.md) - Node.js 版本配置
- [工作空间管理](../07-工作空间/工作空间管理.md) - workspace 配置详解
- [部署指南](../05-部署指南/部署指南.md) - Vue 项目部署

## 📞 故障排除

### 常见问题

#### 1. 镜像源连接失败

```bash
# 错误信息：npm ERR! network timeout
# 解决方案：检查网络连接或更换镜像源
BUILD_VUE_REGISTRY="https://registry.npm.taobao.org"
```

#### 2. 认证失败

```bash
# 错误信息：npm ERR! 401 Unauthorized
# 解决方案：检查认证信息是否正确
BUILD_VUE_REGISTRY_AUTH="username:password"
```

#### 3. 包下载失败

```bash
# 错误信息：npm ERR! 404 Not Found
# 解决方案：检查包名是否正确，或更换镜像源
```

### 调试命令

```bash
# 查看 npm 配置
npm config list

# 测试镜像源连接
npm ping

# 查看详细错误信息
npm install --verbose
```
