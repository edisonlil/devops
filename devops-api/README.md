# DevOps API 启动文档

DevOps 统一可视化管理平台后端 API 服务

## 📋 目录

- [系统要求](#系统要求)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [启动方式](#启动方式)
- [API 接口](#api-接口)
- [开发指南](#开发指南)
- [故障排除](#故障排除)

## 🔧 系统要求

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0 或 **yarn**: >= 1.22.0
- **TypeScript**: >= 5.0.0

## 🚀 快速开始

### 1. 安装依赖

```bash
cd devops-api
npm install
```

或使用 yarn：

```bash
cd devops-api
yarn install
```

### 2. 环境配置

创建环境变量文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 服务器配置
PORT=8080
NODE_ENV=development

# 前端地址（CORS配置）
FRONTEND_URL=http://localhost:3000

# 数据存储路径
DATA_PATH=./data
WORKSPACE_PATH=./data/workspaces
TEMPLATE_PATH=./data/templates

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### 3. 创建必要目录

```bash
mkdir -p data/workspaces data/templates logs
```

## 🏃‍♂️ 启动方式

### 开发模式（推荐）

```bash
npm run dev
```

- 自动重启服务
- TypeScript 实时编译
- 详细错误信息
- 热重载支持

### 生产模式

```bash
# 1. 构建项目
npm run build

# 2. 启动服务
npm start
```

### 测试模式

```bash
npm test
```

## 🌐 API 接口

服务启动后，可以通过以下地址访问：

- **健康检查**: `GET http://localhost:8080/health`
- **工作空间管理**: `http://localhost:8080/workspaces`
- **中间件管理**: `http://localhost:8080/workspaces/:workspace/middleware`
- **模板管理**: `http://localhost:8080/templates`

### 主要接口列表

#### 工作空间接口
- `GET /workspaces` - 获取工作空间列表
- `POST /workspaces` - 创建工作空间
- `GET /workspaces/:name` - 获取工作空间详情
- `PUT /workspaces/:name` - 更新工作空间
- `DELETE /workspaces/:name` - 删除工作空间

#### 中间件接口
- `GET /workspaces/:workspace/middleware` - 获取中间件列表
- `POST /workspaces/:workspace/middleware` - 创建中间件实例
- `GET /workspaces/:workspace/middleware/:id` - 获取中间件详情
- `PUT /workspaces/:workspace/middleware/:id` - 更新中间件
- `DELETE /workspaces/:workspace/middleware/:id` - 删除中间件

#### 模板接口
- `GET /templates` - 获取模板列表
- `POST /templates` - 创建模板
- `GET /templates/:id` - 获取模板详情

## 🛠️ 开发指南

### 项目结构

```
devops-api/
├── src/
│   ├── app.ts              # 应用入口
│   ├── controllers/        # 控制器
│   ├── middleware/         # 中间件
│   ├── routes/            # 路由定义
│   ├── services/          # 业务逻辑
│   ├── types/             # 类型定义
│   └── utils/             # 工具函数
├── data/                  # 数据存储
├── logs/                  # 日志文件
├── dist/                  # 编译输出
└── package.json
```

### 开发命令

```bash
# 开发模式启动
npm run dev

# 构建项目
npm run build

# 生产模式启动
npm start

# 运行测试
npm test

# 类型检查
npx tsc --noEmit
```

## 🔍 故障排除

### 常见问题

#### 1. 端口被占用

```bash
Error: listen EADDRINUSE: address already in use :::8080
```

**解决方案：**
- 修改 `.env` 文件中的 `PORT` 配置
- 或者杀死占用端口的进程：`lsof -ti:8080 | xargs kill -9`

#### 2. 依赖安装失败

```bash
npm ERR! peer dep missing
```

**解决方案：**
```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

#### 3. TypeScript 编译错误

```bash
error TS2307: Cannot find module
```

**解决方案：**
```bash
# 安装类型定义
npm install @types/node @types/express

# 检查 tsconfig.json 配置
npx tsc --showConfig
```

### 日志查看

```bash
# 查看实时日志
tail -f logs/app.log

# 查看错误日志
grep "ERROR" logs/app.log
```

### 健康检查

访问健康检查接口确认服务状态：

```bash
curl http://localhost:8080/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## 📝 环境变量说明

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 8080 | API 服务端口 |
| `NODE_ENV` | development | 运行环境 |
| `FRONTEND_URL` | http://localhost:3000 | 前端地址 |
| `DATA_PATH` | ./data | 数据存储路径 |
| `LOG_LEVEL` | info | 日志级别 |

## 🔗 相关链接

- [前端项目](../devops-web/README.md)
- [API 文档](./docs/api.md)
- [部署指南](./docs/deployment.md)

