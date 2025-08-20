# DevOps Web 管理界面

## 概述

DevOps Web 是一个现代化的可视化管理界面，为 DevOps 工具提供友好的 Web 界面，大大降低了使用门槛，让新手也能轻松上手。

## 功能特性

### 🎯 核心功能
- **仪表板** - 系统状态总览和快速操作
- **工作空间管理** - 可视化创建、编辑、删除工作空间
- **配置编辑器** - 表单化编辑配置文件
- **命令生成器** - 通过表单生成 devops 命令
- **部署管理** - 查看部署历史和状态
- **工具管理** - 可视化安装和管理开发工具

### 🚀 技术特性
- **现代化界面** - Vue 3 + Element Plus
- **实时更新** - WebSocket 实时通信
- **响应式设计** - 适配各种屏幕尺寸
- **RESTful API** - 标准化的后端接口

## 快速开始

### 环境要求
- Node.js 16+
- DevOps 工具已安装

### 安装步骤

1. **安装依赖**
```bash
cd devops-web
npm run install-all
```

2. **启动开发服务器**
```bash
npm run dev
```

3. **访问界面**
打开浏览器访问: http://localhost:5173

### 生产部署

1. **构建前端**
```bash
npm run build
```

2. **启动生产服务器**
```bash
npm start
```

## 界面功能

### 1. 仪表板
- 系统统计信息
- 当前工作空间状态
- 快速操作入口
- 最近活动时间线

### 2. 工作空间管理
- **工作空间列表** - 查看所有工作空间
- **创建工作空间** - 向导式创建新工作空间
- **工作空间详情** - 查看配置、模板、Dockerfile
- **配置编辑** - 可视化编辑配置文件

### 3. 命令生成器
- **项目类型选择** - Java、Vue、Go 等
- **参数配置** - Git URL、分支、构建工具等
- **实时预览** - 生成的命令实时显示
- **一键执行** - 直接执行生成的命令
- **历史记录** - 查看执行历史

### 4. 部署管理
- **部署历史** - 查看所有部署记录
- **部署详情** - 查看部署文件内容
- **统计信息** - 部署统计和分析
- **清理功能** - 清理旧的部署文件

### 5. 工具管理
- **环境检查** - 检查已安装和缺失的工具
- **工具安装** - 可视化安装开发工具
- **安装进度** - 实时显示安装进度
- **安装历史** - 查看安装记录

## API 接口

### 工作空间 API
```
GET    /api/workspace           # 获取所有工作空间
GET    /api/workspace/active    # 获取当前活跃工作空间
POST   /api/workspace/active    # 设置活跃工作空间
GET    /api/workspace/:name     # 获取工作空间详情
POST   /api/workspace           # 创建工作空间
DELETE /api/workspace/:name     # 删除工作空间
```

### 配置 API
```
GET    /api/config/:workspace        # 获取工作空间配置
PUT    /api/config/:workspace        # 更新工作空间配置
GET    /api/config/template/:platform # 获取配置模板
POST   /api/config/validate          # 验证配置
```

### 命令 API
```
POST   /api/command/generate     # 生成命令
POST   /api/command/execute      # 执行命令
GET    /api/command/history      # 获取命令历史
GET    /api/command/execution/:id # 获取执行详情
POST   /api/command/validate     # 验证命令
```

### 工具 API
```
GET    /api/tools/supported      # 获取支持的工具
GET    /api/tools/check          # 检查环境状态
POST   /api/tools/install        # 安装工具
GET    /api/tools/install/history # 获取安装历史
```

### 部署 API
```
GET    /api/deploy/history       # 获取部署历史
GET    /api/deploy/:workspace/:filename # 获取部署文件
DELETE /api/deploy/:workspace/:filename # 删除部署文件
GET    /api/deploy/stats/summary # 获取部署统计
POST   /api/deploy/cleanup       # 清理部署文件
```

## 使用场景

### 场景1：新手快速上手
1. 打开 Web 界面
2. 在工具管理中检查环境
3. 使用命令生成器创建部署命令
4. 一键执行部署

### 场景2：工作空间管理
1. 创建新的工作空间
2. 配置构建平台和参数
3. 上传 Dockerfile 和模板
4. 设置为活跃工作空间

### 场景3：团队协作
1. 标准化工作空间配置
2. 共享部署模板
3. 统一工具安装
4. 部署历史追踪

## 配置说明

### 环境变量
```bash
# DevOps 工具路径
DEVOPS_HOME=/path/to/devops

# 服务端口
PORT=3000
```

### 配置文件
后端配置在 `backend/app.js` 中：
```javascript
const DEVOPS_PATH = process.env.DEVOPS_HOME || path.join(__dirname, '../../');
const WORKSPACE_PATH = path.join(DEVOPS_PATH, 'workspace');
```

## 开发指南

### 项目结构
```
devops-web/
├── backend/              # Node.js 后端
│   ├── app.js           # 主应用
│   ├── routes/          # API 路由
│   │   ├── workspace.js # 工作空间 API
│   │   ├── config.js    # 配置 API
│   │   ├── command.js   # 命令 API
│   │   ├── deploy.js    # 部署 API
│   │   └── tools.js     # 工具 API
│   └── package.json
├── frontend/            # Vue 前端
│   ├── src/
│   │   ├── views/       # 页面组件
│   │   ├── components/  # 通用组件
│   │   ├── api/         # API 调用
│   │   └── router/      # 路由配置
│   └── package.json
└── package.json         # 根配置
```

### 开发命令
```bash
# 安装所有依赖
npm run install-all

# 启动开发服务器（前后端同时启动）
npm run dev

# 仅启动后端
npm run backend

# 仅启动前端
npm run frontend

# 构建前端
npm run build
```

## 故障排除

### 常见问题

1. **端口冲突**
   - 修改 `backend/app.js` 中的端口配置
   - 或设置环境变量 `PORT=其他端口`

2. **DevOps 命令找不到**
   - 确保 `DEVOPS_HOME` 环境变量正确设置
   - 检查 DevOps 工具是否正确安装

3. **WebSocket 连接失败**
   - 检查防火墙设置
   - 确保后端服务正常运行

4. **权限问题**
   - 确保有读写工作空间目录的权限
   - 检查 DevOps 命令的执行权限

## 更新日志

### v1.0.0
- 初始版本发布
- 完整的工作空间管理功能
- 命令生成器和执行功能
- 工具管理和安装功能
- 部署历史查看功能
- 现代化的 Web 界面

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
