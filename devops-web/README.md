# DevOps-Web 统一可视化管理平台

基于 Vue 3 + Naive UI 构建的 DevOps 统一可视化管理平台，提供中间件部署、应用管理、模板管理等功能。

## 🚀 功能特性

### ✅ 已实现功能

- **工作空间管理**
  - 类似 Sealos 的桌面式界面
  - 工作空间切换和管理
  - 工作空间概览和统计

- **中间件管理**
  - 模板选择和浏览
  - 参数配置和验证
  - 部署预览和成本预估
  - 部署进度监控
  - 实例管理和监控
  - 日志查看和下载

- **全局模板管理**
  - 模板创建和编辑
  - 模板分类和搜索
  - 模板版本管理

### 🚧 开发中功能

- **应用管理** - Docker 部署、Git 部署、应用商店
- **监控面板** - 系统监控、性能指标
- **日志管理** - 集中日志查看和分析
- **存储管理** - 存储卷管理
- **权限管理** - 用户权限和角色管理

## 🛠️ 技术栈

- **前端框架**: Vue 3 + TypeScript
- **UI 组件库**: Naive UI
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由管理**: Vue Router
- **HTTP 客户端**: Axios
- **图标库**: @vicons/ionicons5

## 📦 安装和运行

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
cd devops-web
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

### 类型检查

```bash
npm run type-check
```

## 📁 项目结构

```
devops-web/
├── src/
│   ├── api/                 # API 接口
│   │   ├── workspace.ts     # 工作空间 API
│   │   └── middleware.ts    # 中间件 API
│   ├── components/          # 组件
│   │   ├── workspace/       # 工作空间组件
│   │   ├── middleware/      # 中间件组件
│   │   └── common/          # 通用组件
│   ├── views/               # 页面视图
│   │   ├── workspace/       # 工作空间页面
│   │   ├── middleware/      # 中间件页面
│   │   ├── application/     # 应用管理页面
│   │   └── template/        # 模板管理页面
│   ├── stores/              # 状态管理
│   │   ├── workspace.ts     # 工作空间状态
│   │   └── theme.ts         # 主题状态
│   ├── types/               # 类型定义
│   │   ├── workspace.ts     # 工作空间类型
│   │   └── middleware.ts    # 中间件类型
│   ├── router/              # 路由配置
│   ├── styles/              # 样式文件
│   └── main.ts              # 入口文件
├── public/                  # 静态资源
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 🎯 核心功能说明

### 工作空间管理

- **工作空间首页**: 类似 Sealos 的桌面式界面，展示所有可用模块
- **工作空间切换**: 支持多工作空间环境管理
- **概览面板**: 显示资源使用情况、成本统计、最近活动

### 中间件部署流程

1. **选择模板**: 从全局模板和工作空间模板中选择
2. **配置参数**: 动态表单配置，实时验证和成本预估
3. **预览部署**: 查看生成的 YAML 配置和 CLI 命令
4. **执行部署**: 实时监控部署进度和日志
5. **管理实例**: 查看实例详情、日志、扩缩容等操作

### 模板系统

- **全局模板**: 对所有工作空间可见的通用模板
- **工作空间模板**: 特定工作空间的自定义模板
- **动态表单**: 根据模板定义生成配置表单
- **参数验证**: 实时验证配置参数的有效性

## 🔧 配置说明

### API 代理配置

开发环境下，API 请求会代理到后端服务：

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

### 主题配置

支持明暗主题切换，主题状态保存在 localStorage 中。

## 🚀 部署说明

### Docker 部署

```bash
# 构建镜像
docker build -t devops-web .

# 运行容器
docker run -p 3000:80 devops-web
```

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend-service:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🤝 开发规范

### 代码风格

- 使用 TypeScript 进行类型检查
- 组件使用 Composition API
- 遵循 Vue 3 最佳实践

### 组件规范

- 组件名使用 PascalCase
- Props 定义使用 TypeScript 接口
- 事件使用 defineEmits 定义

### API 规范

- 使用统一的 API 客户端
- 错误处理统一在拦截器中处理
- 请求和响应数据使用 TypeScript 类型

## 📝 更新日志

### v1.0.0 (2024-01-01)

- ✅ 完成工作空间管理基础功能
- ✅ 完成中间件部署完整流程
- ✅ 完成全局模板管理
- ✅ 完成基础 UI 组件和样式
- 🚧 应用管理功能开发中

## 📄 许可证

MIT License

## 🙋‍♂️ 支持

如有问题或建议，请提交 Issue 或联系开发团队。
