# Node.js 项目部署指南

本文档详细介绍如何使用 DevOps 工具部署 Node.js 应用程序。

## 📋 前置条件

### 1. 环境要求
- Node.js 环境（推荐 18.x 或更高版本）
- npm、yarn 或 pnpm 包管理器
- Docker 环境
- Git 代码仓库

### 2. 项目要求
- 包含 `package.json` 文件
- 应用监听 `process.env.PORT` 环境变量指定的端口
- 实现健康检查端点（推荐）

## 🚀 快速开始

### 基本部署
```bash
# 从 Git 仓库部署
devops run nodejs --git-url "https://github.com/user/my-nodejs-app.git" my-app

# 从本地打包好的代码部署
devops run nodejs --static-dir ./dist/ my-app
```

### 交互式部署（推荐）
```bash
# 使用交互式模式，系统会引导您完成配置
devops run nodejs my-app -i
```

## 🔧 配置参数

### 基本参数
| 参数 | 说明 | 示例 |
|------|------|------|
| `--git-url` | Git 仓库地址 | `https://github.com/user/app.git` |
| `--git-branch` | Git 分支 | `main`, `develop` |
| `--static-dir` | 本地代码目录或tar包 | `./dist/`, `./app.tar.gz` |
| `--template` | 部署模板 | `nodejs` |
| `--namespace` | Kubernetes 命名空间 | `production` |
| `--workspace` | 工作空间 | `prod` |

### 包管理器支持
Node.js 构建支持自动检测包管理器：

| 检测文件 | 使用的包管理器 | 说明 |
|----------|---------------|------|
| `yarn.lock` | yarn | 优先检测 yarn 项目 |
| `pnpm-lock.yaml` | pnpm | 检测 pnpm 项目 |
| 默认 | npm | 兜底使用 npm |

### npm 镜像源配置
Node.js 项目与 Vue.js 项目共享相同的 npm 镜像源配置：

| 环境变量 | 说明 | 示例 |
|----------|------|------|
| `BUILD_VUE_REGISTRY` | npm 镜像源地址 | `https://registry.npmmirror.com` |
| `BUILD_VUE_REGISTRY_AUTH` | npm 认证信息 | `username:password` 或 `token` |

### 端口配置
| 参数 | 说明 | 示例 |
|------|------|------|
| `--app-port` | 应用端口 | `3000` |
| `--service-port` | 服务端口配置 | `api:3000,admin:9090` |
| `--export-port` | 导出端口（NodePort） | `30300,30090` |
| `--expose-port` | 暴露端口（传统方式） | `30300` |

## 📝 部署示例

### 示例1：基本 Express 应用
```bash
devops run nodejs express-api \
  --git-url "https://github.com/company/express-api.git" \
  --app-port 3000 \
  --namespace development
```

### 示例2：多端口微服务
```bash
devops run nodejs \
  --git-url "https://github.com/company/microservice.git" \
  --service-port "api:3000,health:9090,metrics:9091" \
  --export-port "30300,30090" \
  --namespace production \
  microservice
```

### 示例3：自动检测包管理器
```bash
# 系统会自动检测项目使用的包管理器（yarn/pnpm/npm）
devops run nodejs \
  --git-url "https://github.com/company/react-ssr.git" \
  --app-port 3000 \
  --namespace staging \
  react-ssr
```

### 示例4：使用本地打包代码部署
```bash
# 使用本地目录
devops run nodejs \
  --static-dir ./dist/ \
  --app-port 3000 \
  --expose-port 30300 \
  --namespace staging \
  my-app

# 使用 tar 包
devops run nodejs \
  --static-dir ./my-app.tar.gz \
  --service-port "api:3000,admin:9090" \
  --export-port "30300,30090" \
  --namespace production \
  my-service
```

### 示例5：完整生产环境配置
```bash
devops run nodejs \
  --git-url "https://github.com/company/payment-service.git" \
  --git-branch "release/v2.1.0" \
  --template nodejs \
  --service-port "api:3000,admin:9090,health:9091" \
  --export-port "api:30300,admin:30090" \
  --namespace production \
  --workspace prod \
  payment-service
```

## 🏗️ 项目结构要求

### 标准 Node.js 项目结构
```
my-nodejs-app/
├── package.json          # 必需：项目依赖和脚本
├── package-lock.json     # 推荐：锁定依赖版本
├── app.js               # 应用入口文件
├── src/                 # 源代码目录
├── public/              # 静态资源（可选）
├── .env.example         # 环境变量示例
└── README.md            # 项目说明
```

### package.json 示例
```json
{
  "name": "my-nodejs-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node app.js",
    "build": "npm run build:assets",
    "dev": "nodemon app.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 应用代码示例
```javascript
// app.js
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/ready', (req, res) => {
  res.status(200).json({ 
    status: 'ready', 
    timestamp: new Date().toISOString()
  });
});

// 业务路由
app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

## 🔍 健康检查

DevOps 系统会自动为 Node.js 应用配置健康检查。如果您的应用没有健康检查端点，系统会自动创建一个 `healthcheck.js` 文件。

### 推荐的健康检查端点
- `/health` - 存活性检查（liveness probe）
- `/ready` - 就绪性检查（readiness probe）

### 自定义健康检查
```javascript
// 数据库连接检查
app.get('/health', async (req, res) => {
  try {
    // 检查数据库连接
    await db.ping();
    res.status(200).json({ status: 'healthy' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

## 🐳 Docker 构建

系统会自动使用 Node.js 模板中的 Dockerfile 构建镜像：

### 构建特性
- 基于 `node:18-alpine` 镜像
- 多阶段构建优化
- 非 root 用户运行
- 自动安装依赖
- 支持构建脚本执行

### 自定义构建命令
```bash
# 执行自定义构建命令（系统会先安装依赖，然后执行自定义命令）
devops run nodejs \
  --git-url "https://github.com/user/app.git" \
  --build-cmds "npm run lint && npm run test && npm run build" \
  my-app

# 复杂的构建流程
devops run nodejs \
  --git-url "https://github.com/user/app.git" \
  --build-cmds "npm run build:prod && npm run optimize && npm run bundle-analyze" \
  my-app
```

**注意**: 使用 `--build-cmds` 时，系统会：
1. 根据包管理器自动安装依赖
2. 然后执行您指定的自定义构建命令
3. 这确保了构建命令能够使用已安装的依赖

## 📦 本地代码部署

如果您已经在本地构建好了 Node.js 应用，可以使用 `--static-dir` 参数直接部署，跳过 Git 拉取和构建过程。

### 支持的格式

| 格式 | 说明 | 示例 |
|------|------|------|
| **目录** | 自动打包为 tar | `--static-dir ./dist/` |
| **.tar** | 直接使用 tar 包 | `--static-dir ./build.tar` |
| **.tar.gz** | 压缩的 tar 包 | `--static-dir ./build.tar.gz` |
| **.tar.bz2** | bzip2 压缩的 tar 包 | `--static-dir ./build.tar.bz2` |

### 使用示例

#### 本地目录部署
```bash
# 1. 本地构建应用
npm install
npm run build

# 2. 直接部署构建结果
devops run nodejs \
  --static-dir ./dist/ \
  --app-port 3000 \
  --expose-port 30300 \
  my-app
```

#### tar 包部署
```bash
# 1. 打包构建好的应用
tar -czf my-app.tar.gz -C ./dist .

# 2. 使用 tar 包部署
devops run nodejs \
  --static-dir ./my-app.tar.gz \
  --service-port "api:3000,admin:9090" \
  --export-port "30300,30090" \
  my-app
```

### 工作流程

1. **跳过 SCM**：不从 Git/SVN 拉取代码
2. **处理本地资源**：
   - 目录：自动打包为 `dist.tar`
   - tar包：直接复制到构建目录
3. **继续构建**：正常进行 Docker 镜像构建和部署

### 使用场景

- **CI/CD 流水线**：先构建，再部署
- **本地开发测试**：快速部署测试版本
- **多环境部署**：使用相同的构建产物部署到不同环境
- **离线部署**：不依赖网络连接到代码仓库

## 🌐 npm 镜像源配置

Node.js 项目与 Vue.js 项目共享相同的 npm 镜像源配置，这样可以保持配置的一致性。

### 配置方式

#### 1. 工作空间配置
在工作空间配置文件中设置：
```bash
# workspace/your-workspace/config
BUILD_VUE_REGISTRY=https://registry.npmmirror.com
BUILD_VUE_REGISTRY_AUTH=your-token-or-username:password
```

#### 2. 环境变量配置
```bash
export BUILD_VUE_REGISTRY=https://registry.npmmirror.com
export BUILD_VUE_REGISTRY_AUTH=your-auth-info
```

### 常用镜像源
- **淘宝镜像**: `https://registry.npmmirror.com`
- **腾讯镜像**: `https://mirrors.cloud.tencent.com/npm/`
- **华为镜像**: `https://mirrors.huaweicloud.com/repository/npm/`
- **官方镜像**: `https://registry.npmjs.org`

### 认证配置
支持两种认证格式：
- **Token 格式**: `your-auth-token`
- **用户名密码格式**: `username:password`

## 🔧 故障排除

### 常见问题

1. **端口监听问题**
   ```javascript
   // 错误：硬编码端口
   app.listen(3000);
   
   // 正确：使用环境变量
   const port = process.env.PORT || 3000;
   app.listen(port);
   ```

2. **健康检查失败**
   - 确保应用实现了 `/health` 和 `/ready` 端点
   - 检查端口配置是否正确
   - 验证应用启动时间

3. **依赖安装失败**
   - 检查 `package.json` 文件格式
   - 确认网络连接和 npm 镜像配置
   - 查看构建日志排查具体错误

### 调试命令
```bash
# 查看 Pod 状态
kubectl get pods -n {namespace} | grep {app-name}

# 查看应用日志
kubectl logs -f deployment/{app-name} -n {namespace}

# 进入容器调试
kubectl exec -it deployment/{app-name} -n {namespace} -- /bin/sh

# 端口转发测试
kubectl port-forward deployment/{app-name} 8080:3000 -n {namespace}
```

## 📚 相关文档

- [端口配置详解](../04-配置指南/02-多端口配置.md)
- [模板系统](../06-模板系统/模板系统.md)
- [工作空间管理](../07-工作空间/工作空间管理.md)
- [故障排除](../11-故障排除/故障排除.md)
