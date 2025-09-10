# Node.js 应用部署模板

## 概述

此模板用于在 Kubernetes 集群中部署 Node.js 应用程序。

## 模板变量

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `?module_name` | 应用模块名称 | `my-nodejs-app` |
| `?namespace` | Kubernetes 命名空间 | `default` |
| `?image_path` | Docker 镜像路径 | `harbor.example.com/project/my-nodejs-app:latest` |
| `?app_port` | 应用端口 | `3000` |
| `?node_env` | Node.js 环境 | `production` |
| `?harbor_secret_name` | Harbor 镜像拉取密钥 | `harbor-secret` |

## 功能特性

- **健康检查**: 包含存活性和就绪性探针
- **资源限制**: 设置了内存和CPU的请求和限制
- **安全性**: 使用非root用户运行
- **环境变量**: 预配置常用的Node.js环境变量

## 健康检查端点

应用需要实现以下健康检查端点：

- `/health` - 存活性检查
- `/ready` - 就绪性检查

## 使用方法

### 基本部署
```bash
# 使用默认配置部署nodejs应用
devops run nodejs my-app --git-url "https://github.com/user/my-nodejs-app.git"
```

### 端口配置
```bash
# 指定应用端口
devops run nodejs my-app --app-port 3000

# 使用多端口配置
devops run nodejs my-app --service-port "http:3000,admin:9090" --export-port "30300,30090"

# 暴露NodePort端口
devops run nodejs my-app --app-port 3000 --expose-port 30300
```

### 完整示例
```bash
# 完整的nodejs应用部署
devops run nodejs my-nodejs-api \
  --git-url "https://github.com/company/nodejs-api.git" \
  --git-branch "main" \
  --workspace "production" \
  --service-port "api:3000,health:9090" \
  --export-port "30300,30090"
```

## 注意事项

1. 确保应用监听 `process.env.PORT` 环境变量指定的端口
2. 实现健康检查端点以确保容器健康状态监控
3. 应用应该优雅处理 SIGTERM 信号以支持滚动更新
