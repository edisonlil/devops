# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a DevOps automation platform with three main components:

1. **DevOps CLI Tool**: Shell-based deployment automation system (`bin/`, `templates/`, `workspace/`)
2. **DevOps API**: Node.js/Express backend API (`devops-api/`)  
3. **DevOps Web**: Vue.js frontend interface (`devops-web/`)

The platform supports automated deployment of Java, Vue, Go, Nginx, and other applications to Docker Swarm and Kubernetes clusters.

## Common Commands

### DevOps CLI Tool
```bash
# Main DevOps deployment command
devops run <type> <project-name> [options]

# Available via Makefile
make install          # Standard installation
make full            # Complete installation with all tools
make script-only     # Install only DevOps scripts
make test            # Run installation tests
make clean           # Clean temporary files
```

### DevOps API (Node.js Backend)
```bash
cd devops-api/

# Development
npm run dev          # Start development server with nodemon
npm run build        # TypeScript compilation
npm run start        # Start production server
npm run test         # Run Jest tests
```

### DevOps Web (Vue.js Frontend)  
```bash
cd devops-web/

# Development
npm run dev          # Start Vite dev server (port 3000)
npm run build        # Build for production (includes TypeScript checking)
npm run preview      # Preview production build
npm run type-check   # TypeScript type checking only
```

## Architecture

### Core Components

**DevOps CLI (`bin/`)**: 
- `devops` - Main CLI entry point
- `build.sh` - Core deployment logic and functions
- `*_build` scripts - Language-specific build handlers (java_build, vue_build, etc.)
- Python scripts for template rendering and port configuration

**Templates (`templates/`)**:
- `k8s/` - Kubernetes deployment templates
- `compose/` - Docker Compose templates  
- `swarm/` - Docker Swarm templates
- Supports Jinja2 templating with `.j2` extension

**Workspaces (`workspace/`)**:
- Project-specific configurations and templates
- Two-tier template system: workspace templates override global templates
- Each workspace contains `config`, `deploy/`, and optional `templates/` directories

**APIs and Web Interface**:
- RESTful API built with Express.js and TypeScript
- Vue 3 frontend with Naive UI components
- Real-time middleware deployment and monitoring

### Key Features

- **Multi-platform deployment**: Supports Docker Swarm and Kubernetes
- **Template system**: Global and workspace-level template hierarchy
- **Interactive deployment**: Guided configuration with `-i` flag
- **Multi-port configuration**: Advanced port mapping with `--service-port`/`--export-port`
- **Version management**: Build tool version control with `--build-version`
- **Remote deployment**: Deploy from local machine to remote clusters

## Development Workflow

### Working with Templates
```bash
# List available templates
devops template list

# Copy global template to workspace
devops template copy <template-id> --workspace <name>

# Templates support additional files (nginx.conf, application.yml, etc.)
# Place files in template directory, they're automatically copied during build
```

### Building and Testing

1. **API Development**: Use `npm run dev` in `devops-api/` for hot reload
2. **Web Development**: Use `npm run dev` in `devops-web/` for Vite dev server
3. **CLI Testing**: Use `make test` for installation validation
4. **TypeScript**: Both API and Web have TypeScript configurations with strict mode

### Configuration Management

- Global config: `workspace/enable` file defines active workspaces
- Workspace config: `workspace/{name}/config` contains deployment parameters
- Deploy targets: `~/.deploy/deploy-target` for remote cluster configuration
- Python dependencies: Auto-installed via `bin/install_python_deps.sh`

## Important Notes

- The platform uses Python scripts for advanced template rendering and YAML processing
- Template files with `.j2` extension use Jinja2 templating engine
- Port configuration supports both traditional (`--app-port`/`--expose-port`) and advanced (`--service-port`/`--export-port`) modes
- Version management separates build tools (`--build-version`) from environment config (`--build-env`)
- Always run installation tests after setup changes


## 开发新功能建议

1. 实现功能后，编写的测试脚本/用例记得删除（由于当前环境的windows无法通过执行测试bash脚本进行验证， 你可以通过别的方式简单验证（如语法，逻辑，有无明显逻辑漏洞等）后我自行上传到服务器验证）
2. 脚本不需要兼容windows。
3. 记得更新文档（如需创建文档需按照文档统一风格，阅读序号+中文命名）/site的说明。，以及help指令描述，包括自动补全脚本。
4. 如果对调整的方向存在疑问或者有更好的解决记得及时沟通，始终明确调整目标，避免无端修改。


## DevOps API 与 Web 前端对接规范

### API 服务配置

**DevOps API** 运行在 `localhost:3000`（开发环境）或 `localhost:8080`（生产环境），提供RESTful API服务：
- 健康检查：`GET /health`
- 所有业务接口都以 `/api` 开头
- 支持CORS，允许前端跨域请求
- **双重认证机制**：支持 Token Header 认证（推荐）和 Express Session 认证（兼容模式）

**主要路由配置**：
```typescript
// devops-api/src/app.ts
app.use('/api/auth', authRoutes);           // 认证相关
app.use('/api/remote', remoteRoutes);       // 远程主机管理
app.use('/api/workspaces', workspaceRoutes); // 工作空间管理
app.use('/api/workspaces/:workspace/middleware', middlewareRoutes); // 中间件部署
app.use('/api/templates', templateRoutes);  // 模板管理
app.use('/api/workspaces/:workspace/deploy', deployRoutes); // 应用部署
```

### 前端API配置

**DevOps Web** 通过Vite代理转发API请求：
```typescript
// devops-web/vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true
      // 注意：不要添加rewrite规则，保持完整的/api路径
    }
  }
}
```

**前端API客户端配置**：
```typescript
// 所有API文件中的axios配置
const api = axios.create({
  baseURL: '/api',  // 使用相对路径，由Vite代理转发
  timeout: 10000,
  withCredentials: true // 支持Session
})
```

### 关键注意事项

1. **路径规范**：
   - **后端路由**：所有业务接口以 `/api` 开头
   - **前端请求**：使用相对路径，如 `'/auth/login'`、`'/remote/workspaces'`
   - **避免双重前缀**：前端不要在相对路径前再加 `/api`

2. **错误案例**：
   ```typescript
   // ❌ 错误：会导致 /api/api/auth/login
   return request.post('/api/auth/login', data)
   
   // ✅ 正确：baseURL + 相对路径 = /api + /auth/login
   return request.post('/auth/login', data)
   ```

3. **代理配置**：
   - Vite代理会将 `/api/*` 转发到 `localhost:8080/api/*`
   - 不要使用 `rewrite` 规则删除 `/api` 前缀
   - 确保 `changeOrigin: true` 处理跨域

4. **认证机制**：
   - **Token Header 认证**（推荐）：使用 `Authorization: Bearer <token>` 头传递认证信息
   - **Express Session 认证**（兼容模式）：传统的 Session Cookie 认证
   - 前端响应拦截器处理401跳转登录页
   - Token过期时间为30分钟，Session过期时间为2小时

5. **开发端口**：
   - API服务：开发环境 3000，生产环境 8080
   - Web服务：Vite自动分配端口（3000、3001、3002等）

### API接口分类

- **认证接口** (`/api/auth/*`): SSH登录、会话管理、权限检查
- **远程主机** (`/api/remote/*`): 远程工作空间、连接状态检查
- **工作空间** (`/api/workspaces/*`): 本地工作空间管理、配置读写
- **中间件部署** (`/api/workspaces/:workspace/middleware/*`): 模板管理、部署执行
- **应用部署** (`/api/workspaces/:workspace/deploy/*`): DevOps命令执行、部署历史

## Token Header 认证机制

**DevOps API 采用双重认证机制，优先使用 Token Header 认证，向后兼容 Session Cookie 认证**

### 1. 认证机制概述

#### Token Header 认证（推荐）
- **传输方式**：HTTP Authorization Header
- **格式**：`Authorization: Bearer <token>`
- **优势**：无 Cookie 冲突、标准化、安全性高
- **过期时间**：30分钟自动过期
- **适用场景**：所有新开发的功能

#### Session Cookie 认证（兼容模式）
- **传输方式**：HTTP Cookie
- **格式**：Express Session Cookie
- **优势**：向后兼容现有系统
- **过期时间**：2小时自动过期
- **适用场景**：兼容旧版本客户端

### 2. Token 生成和验证

#### Token 结构
```
Token = Base64(sessionId:timestamp:random) + "." + HMAC-SHA256(payload, secret)
```

#### 生成流程
```typescript
// 1. SSH 登录成功后生成 Token
const timestamp = Date.now().toString();
const random = crypto.randomBytes(16).toString('hex');
const payload = `${sessionId}:${timestamp}:${random}`;

// 2. 使用 HMAC-SHA256 签名
const secret = process.env.SESSION_SECRET || 'devops-platform-secret-key';
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

// 3. 组合成最终 Token
const token = `${Buffer.from(payload).toString('base64')}.${signature}`;
```

#### 验证流程
```typescript
// 1. 解析 Token
const [payloadBase64, signature] = token.split('.');
const payload = Buffer.from(payloadBase64, 'base64').toString();
const [sessionId, timestamp, random] = payload.split(':');

// 2. 验证签名
const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
if (signature !== expectedSignature) return null;

// 3. 检查过期时间
const tokenAge = Date.now() - parseInt(timestamp);
if (tokenAge > 30 * 60 * 1000) return null; // 30分钟过期
```

### 3. 前端集成

#### Token 管理器 (`TokenManager`)
```typescript
class TokenManager {
  // 设置 Token（登录成功后调用）
  static setTokenFromLoginResponse(response: any): void {
    const tokenData = {
      token: response.token,
      sessionId: response.sessionId,
      host: response.host,
      username: response.username,
      expiresAt: Date.now() + config.auth.tokenExpiry
    };
    localStorage.setItem('DEVOPS_AUTH_TOKEN', JSON.stringify(tokenData));
  }

  // 获取有效 Token
  static getValidToken(): string | null {
    const tokenData = this.getTokenData();
    if (!tokenData || Date.now() > tokenData.expiresAt) {
      this.clearToken();
      return null;
    }
    return tokenData.token;
  }

  // 自动添加认证头
  static addAuthHeaders(headers: any = {}): any {
    const token = this.getValidToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-DevOps-Session-ID'] = this.getSessionId();
    }
    return headers;
  }
}
```

#### API 请求拦截器
```typescript
// 请求拦截器：自动添加认证头
api.interceptors.request.use((config) => {
  config.headers = TokenManager.addAuthHeaders(config.headers);
  return config;
});

// 响应拦截器：处理 Token 过期
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      TokenManager.clearToken();
      router.push('/login');
    }
    return Promise.reject(error);
  }
);
```

### 4. 后端认证处理

#### 统一认证工具类 (`AuthUtils`)
```typescript
export class AuthUtils {
  // 获取会话ID（支持双重认证）
  static getSessionId(req: Request, controllerName: string = 'Unknown'): string | null {
    // 1. 优先从 Authorization 头获取 Token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const tokenData = this.verifyAuthToken(token);
      if (tokenData) {
        console.log(`✅ 使用 Token Header 认证 (${controllerName}):`, { sessionId: tokenData.sessionId });
        return tokenData.sessionId;
      }
    }

    // 2. 从自定义头获取（备用方式）
    const headerSessionId = req.headers['x-devops-session-id'] as string;
    if (headerSessionId) {
      console.log(`⚠️ 使用自定义 Header 认证 (${controllerName}):`, { sessionId: headerSessionId });
      return headerSessionId;
    }

    // 3. 从 Session 获取（兼容模式）
    const sessionId = (req.session as any).sessionId;
    if (sessionId) {
      console.log(`⚠️ 使用 Cookie Session 认证 (${controllerName}):`, { sessionId: sessionId });
      return sessionId;
    }

    console.log(`❌ ${controllerName}: 未找到有效的认证信息`);
    return null;
  }
}
```

#### Controller 中的使用
```typescript
// 所有需要认证的 API 方法
async someApiMethod(req: Request, res: Response) {
  try {
    // 使用统一认证工具获取会话ID
    const sessionId = AuthUtils.getSessionId(req, 'SomeController');
    if (!sessionId) {
      res.status(401).json({
        success: false,
        message: '会话无效'
      });
      return;
    }

    // 业务逻辑...
    res.json({ success: true, data: result });
    return;
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
    return;
  }
}
```

### 5. 配置和部署

#### 前端配置 (`config/index.ts`)
```typescript
export const config = {
  auth: {
    mode: 'token',  // 默认使用 Token 认证
    tokenExpiry: 30 * 60 * 1000,  // 30分钟
    cookieMode: 'compatible'  // 兼容模式
  }
};
```

#### 环境变量
```bash
# .env 文件
SESSION_SECRET=your-secret-key-here  # Token 签名密钥
PORT=3000  # API 服务端口
```

### 6. 故障排除

#### 常见问题

**问题 1：Token 认证失败，返回 401**
- 检查 Token 是否正确传递到 Authorization 头
- 验证 Token 是否过期（30分钟）
- 确认后端 SESSION_SECRET 配置正确

**问题 2：部分 API 仍使用 Cookie 认证**
- 检查 Controller 是否使用了 `AuthUtils.getSessionId()`
- 确认没有直接使用 `(req.session as any).sessionId`

**问题 3：前端 Token 管理异常**
- 检查 localStorage 中的 Token 数据格式
- 验证 TokenManager 的过期时间计算
- 确认 API 拦截器正确添加认证头

#### 调试方法

**后端日志**：
```bash
# 查看认证日志
✅ 使用 Token Header 认证 (ApplicationController): { sessionId: 'xxx' }
⚠️ 使用 Cookie Session 认证 (ApplicationController): { sessionId: 'xxx' }
❌ ApplicationController: 未找到有效的认证信息
```

**前端调试**：
```javascript
// 检查 Token 状态
console.log('Token 数据:', TokenManager.getTokenData());
console.log('有效 Token:', TokenManager.getValidToken());

// 检查 API 请求头
console.log('请求头:', config.headers);
```

### 7. 最佳实践

1. **优先使用 Token Header 认证**：新开发的功能应使用 Token 认证
2. **保持向后兼容**：现有系统可继续使用 Session 认证
3. **统一错误处理**：所有 Controller 使用 `AuthUtils.getSessionId()`
4. **安全配置**：生产环境使用强密钥，定期轮换
5. **监控和日志**：记录认证方式和失败原因，便于故障排除

## devops-api TypeScript开发规范

**注意：以下规范仅适用于 devops-api 项目，不适用于其他组件（devops-web、CLI工具等）**

1. **严格模式配置**
    - 已开启 `"strict": true`, `"noImplicitReturns": true`
    - 所有函数必须显式声明参数类型，但**避免**显式声明Controller返回值类型
    - Express路由处理函数**不要**添加`Promise<void>`返回类型注解

2. **Controller方法规范**
    ```typescript
    // ✅ 正确：不指定返回类型，让TypeScript推断
    async sshLogin(req: Request, res: Response) {
      try {
        if (error) {
          res.status(400).json({ error: 'message' });
          return; // 必须显式返回
        }
        res.json({ success: true });
        return; // 必须显式返回
      } catch (error) {
        res.status(500).json({ error: 'message' });
        return; // 必须显式返回
      }
    }
    
    // ❌ 错误：不要添加返回类型注解
    async sshLogin(req: Request, res: Response): Promise<void> {
      // 会导致编译错误
    }
    ```

3. **认证处理规范**
    ```typescript
    // ✅ 推荐：使用统一认证工具类（支持 Token Header + Session）
    import { AuthUtils } from '../utils/AuthUtils';
    const sessionId = AuthUtils.getSessionId(req, 'ControllerName');

    // ⚠️ 兼容：直接访问 Session（仅在特殊情况下使用）
    const sessionId = (req.session as any).sessionId;
    (req.session as any).sessionId = newSessionId;

    // ❌ 错误：直接访问会编译错误
    const sessionId = req.session.sessionId;
    ```

4. **返回语句规范**
    - 由于`noImplicitReturns: true`，所有代码路径必须有返回
    - 在`res.json()`后添加`return;`
    - 避免使用`return res.json()`形式

5. **编译检查流程**
    ```bash
    # 开发时必须运行的检查命令
    npm run build          # 或 npx tsc --noEmit
    ```

6. **类型定义**
    - 使用 `interface` 定义API请求/响应结构
    - Service层方法必须有明确的返回类型
    - 避免使用`any`类型（Session访问除外）

7. **错误处理标准模式**
    ```typescript
    import { AuthUtils } from '../utils/AuthUtils';

    async methodName(req: Request, res: Response) {
      try {
        // 1. 认证验证（推荐使用 AuthUtils）
        const sessionId = AuthUtils.getSessionId(req, 'ControllerName');
        if (!sessionId) {
          res.status(401).json({ success: false, message: '会话无效' });
          return;
        }

        // 2. 参数验证
        if (!param) {
          res.status(400).json({ success: false, message: '参数错误' });
          return;
        }

        // 3. 业务逻辑
        const result = await service.doSomething(sessionId);
        res.json({ success: true, data: result });
        return;
      } catch (error: any) {
        console.error('操作失败:', error);
        res.status(500).json({ success: false, message: error.message });
        return;
      }
    }
    ```

**重要提醒**：遵循这些规范可避免常见的TypeScript编译错误，特别是"Not all code paths return a value"和Session属性访问问题。

## devops-web 前端字体设计规范

**注意：以下规范仅适用于 devops-web 前端项目，确保整个应用的字体样式统一性**

### 1. 字体家族规范

```css
/* 主要字体家族 */
--font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;  /* 用于标题 */
--font-text: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;        /* 用于正文 */
```

### 2. 字体大小规范

```css
/* 字体大小层级 */
--font-size-h1: 32px;        /* 页面主标题 (如：控制台、应用管理) */
--font-size-h2: 24px;        /* 区域标题 */
--font-size-h3: 18px;        /* 列表标题 (如：应用列表) */
--font-size-h4: 17px;        /* 卡片标题 (如：功能卡片标题) */
--font-size-body: 14px;      /* 正文内容 (如：描述文字) */
--font-size-subtitle: 17px;  /* 副标题 (如：页面副标题) */
--font-size-caption: 13px;   /* 说明文字 */
--font-size-small: 12px;     /* 小字 (如：主机地址) */
--font-size-tiny: 10px;      /* 极小字 (如：统计标签) */
```

### 3. 字体粗细规范

```css
/* 字体粗细 */
--font-weight-bold: 700;     /* 粗体 (主标题) */
--font-weight-semibold: 600; /* 半粗体 (区域标题、卡片标题) */
--font-weight-medium: 500;   /* 中等 (小字、说明文字) */
--font-weight-regular: 400;  /* 常规 (正文内容) */
```

### 4. 行高规范

```css
/* 行高 */
--line-height-tight: 1.1;    /* 紧密 (主标题) */
--line-height-normal: 1.3;   /* 正常 (标题类) */
--line-height-relaxed: 1.4;  /* 宽松 (正文、副标题) */
```

### 5. 颜色规范

```css
/* 文字颜色 */
--text-primary: #1d1d1f;     /* 主要文字 (标题、重要内容) */
--text-secondary: #86868b;   /* 次要文字 (副标题、描述) */
--text-tertiary: #c7c7cc;    /* 三级文字 (辅助信息) */
```

### 6. 预定义样式类

为保持一致性，提供以下预定义样式类：

```css
.text-h1      /* 页面主标题样式 */
.text-h2      /* 区域标题样式 */
.text-h3      /* 列表标题样式 */
.text-h4      /* 卡片标题样式 */
.text-body    /* 正文内容样式 */
.text-subtitle /* 副标题样式 */
.text-caption /* 说明文字样式 */
.text-small   /* 小字样式 */
.text-tiny    /* 极小字样式 */
```

### 7. 使用示例

```vue
<template>
  <!-- 页面标题 -->
  <h1 class="page-title text-h1">应用管理</h1>
  <p class="page-subtitle text-subtitle">部署和管理容器化应用程序</p>

  <!-- 列表标题 -->
  <span class="text-h3">应用列表</span>

  <!-- 卡片内容 -->
  <h3 class="card-title text-h4">中间件管理</h3>
  <p class="card-description text-body">Redis、MySQL、Nginx 等中间件服务</p>

  <!-- 统计信息 -->
  <span class="stat-value text-body">24</span>
  <span class="stat-label text-tiny">总资源</span>
</template>
```

### 8. 开发规范

1. **统一性原则**：所有组件必须使用预定义的字体样式类，不得自定义字体大小和粗细
2. **层级清晰**：严格按照信息层级使用对应的字体大小
3. **语义化**：根据内容语义选择合适的字体样式，而非视觉效果
4. **可维护性**：使用CSS变量和样式类，便于全局调整和维护

### 9. 检查清单

在开发新组件或修改现有组件时，请检查：

- [ ] 是否使用了预定义的字体样式类
- [ ] 字体大小是否符合信息层级
- [ ] 是否移除了自定义的font-size、font-weight、font-family属性
- [ ] 颜色是否使用了规范的文字颜色变量
- [ ] 行高是否合适且一致

**重要提醒**：遵循字体规范可确保整个应用的视觉一致性和用户体验的统一性。

## devops-web 按钮样式规范

**注意：以下规范仅适用于 devops-web 前端项目，解决 Naive UI 按钮绿色边框问题并建立统一的按钮样式**

### 1. 问题背景

在使用 Naive UI 的 `n-button` 组件时，主要按钮 (`type="primary"`) 会出现不期望的绿色边框，影响整体设计的一致性。

### 2. 解决方案

#### 全局样式配置 (`src/styles/main.css`)

```css
/* 全局组件样式覆盖 */
.n-button {
  font-weight: 400 !important;
  border-radius: 8px !important;
}

/* 移除所有按钮的默认边框和轮廓 */
.n-button,
.n-button:hover,
.n-button:focus,
.n-button:active,
.n-button:focus-visible {
  outline: none !important;
}

/* 只移除边框，保持其他样式 */
.n-button .n-button__border,
.n-button .n-button__state-border {
  display: none !important;
}

/* 按钮样式 - 保持样式但去除边框 */
.n-button--primary-type {
  background: #007AFF !important;
  color: white !important;
  border-radius: 8px !important;
}

.n-button--primary-type:hover {
  background: #0056CC !important;
  color: white !important;
}

.n-button--primary-type:focus {
  background: #007AFF !important;
  color: white !important;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2) !important;
}

.n-button--primary-type:active {
  background: #0056CC !important;
  color: white !important;
}
```

#### 主题配置 (`src/App.vue`)

```vue
<template>
  <n-config-provider
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <!-- 应用内容 -->
  </n-config-provider>
</template>

<script setup lang="ts">
// 主题覆盖配置 - 确保按钮无边框
const themeOverrides = {
  Button: {
    border: 'none',
    borderHover: 'none',
    borderPressed: 'none',
    borderFocus: 'none',
    borderDisabled: 'none',
    colorPrimary: '#007AFF',
    colorHoverPrimary: '#0056CC',
    colorPressedPrimary: '#0056CC',
    colorFocusPrimary: '#007AFF',
    borderPrimary: 'none',
    borderHoverPrimary: 'none',
    borderPressedPrimary: 'none',
    borderFocusPrimary: 'none',
    borderDisabledPrimary: 'none'
  }
}
</script>
```

### 3. 颜色规范

#### 主要按钮颜色
- **默认状态**: `#007AFF` (iOS蓝色)
- **悬停状态**: `#0056CC` (深蓝色)
- **按下状态**: `#0056CC` (深蓝色)
- **聚焦状态**: `#007AFF` + 阴影 `0 0 0 2px rgba(0, 122, 255, 0.2)`

#### 文字颜色
- **所有状态**: `white` (白色文字)

### 4. 使用示例

#### 基础用法
```vue
<template>
  <n-button type="primary" @click="handleClick">
    部署应用
  </n-button>
</template>
```

#### 带图标的按钮
```vue
<template>
  <n-button type="primary" @click="handleDeploy">
    <template #icon>
      <n-icon><Add /></n-icon>
    </template>
    部署应用
  </n-button>
</template>
```

### 5. 其他按钮类型

```css
/* 小按钮样式 */
.n-button--small-size {
  border-radius: 6px !important;
}

/* 次要按钮样式 */
.n-button--quaternary-type {
  border-radius: 6px !important;
}
```

### 6. 页面级样式补充

在特定页面中，如果需要额外确保按钮无边框：

```css
/* 确保按钮无边框 */
.n-button--primary-type .n-button__border,
.n-button--primary-type .n-button__state-border {
  display: none !important;
}
```

### 7. 最佳实践

1. **样式优先级**：使用 `!important` 确保样式优先级
2. **边框处理**：通过 `display: none` 隐藏 Naive UI 的边框元素
3. **主题配置**：使用主题覆盖配置从源头解决边框问题
4. **响应式**：按钮样式在所有屏幕尺寸下保持一致
5. **可访问性**：保持聚焦状态的视觉反馈（阴影）

### 8. 故障排除

#### 问题：按钮仍然有绿色边框
**解决方案**：
1. 检查是否正确导入了 `main.css`
2. 确认主题覆盖配置是否生效
3. 使用浏览器开发者工具检查CSS优先级

#### 问题：按钮样式完全消失
**解决方案**：
1. 检查是否过度使用了 `display: none`
2. 确保只隐藏边框元素，不隐藏按钮本身
3. 恢复基础的背景色和文字颜色

### 9. 维护说明

#### 更新颜色
如需更改按钮颜色，需要同时更新：
1. `main.css` 中的CSS样式
2. `App.vue` 中的主题覆盖配置

#### 版本兼容性
- 当前配置适用于 Naive UI v2.x
- 升级 Naive UI 版本时需要重新测试按钮样式

**重要提醒**：通过多层防护（CSS样式 + 主题配置 + 页面级补充），成功解决了 Naive UI 按钮的绿色边框问题，确保了按钮在整个应用中的视觉一致性。

## 开发实践要点总结

### 模板系统开发规范

#### 路径优先级处理
在实现多层级模板系统时，**必须确保优先级逻辑正确**：

```bash
# ❌ 错误：后续检查会覆盖前面的设置
if [ -d "$path1" ]; then TEMPLATE_PATH="$path1"; fi
if [ -d "$path2" ]; then TEMPLATE_PATH="$path2"; fi  # 会覆盖path1！

# ✅ 正确：使用条件判断确保优先级
if [ -z "$TEMPLATE_PATH" ] && [ -d "$path1" ]; then TEMPLATE_PATH="$path1"; fi
if [ -z "$TEMPLATE_PATH" ] && [ -d "$path2" ]; then TEMPLATE_PATH="$path2"; fi
```

**经验教训**：Shell脚本的路径查找逻辑容易出错，务必用 `[ -z "$VAR" ]` 确保只在变量为空时设置。

#### 字符串处理陷阱
Python脚本输出解析时的常见错误：

```typescript
// ❌ 错误：双反斜线会导致分割失败
const lines = output.split('\\n')
files[filename] = content.join('\\n')

// ✅ 正确：使用单反斜线
const lines = output.split('\n') 
files[filename] = content.join('\n')
```

### 异步执行模式设计

#### 长时间任务的处理策略
对于部署等长时间任务，采用**异步+轮询**模式：

1. **立即返回执行ID**：避免HTTP超时，提升响应性
2. **状态轮询**：前端定期查询执行状态
3. **合理超时**：根据业务场景设定（部署通常需要30-60分钟）

```typescript
// 后端：异步执行，立即返回
res.json({ executionId, status: 'running' })
this.executeCommandAsync(executionId, command)  // 不等待结果

// 前端：轮询监控
const pollInterval = 3000  // 避免过于频繁
const maxPolls = 1200     // 60分钟超时
```

#### 用户体验优化
- **阶段性提示**：根据执行时长给出不同的状态说明
- **避免日志噪音**：只在关键时间点输出状态更新
- **人性化时间显示**：`15m30s` 比 `930s` 更易理解

### Vue.js 开发实践

#### 条件渲染的性能考虑
对于复杂的条件显示，使用 `v-show` 而不是 `v-if`：

```vue
<!-- ✅ 适用于频繁切换的场景 -->
<div v-show="currentView === 'config'">...</div>
<div v-show="currentView === 'preview'">...</div>

<!-- ❌ 每次切换都会重新渲染 -->
<div v-if="currentView === 'config'">...</div>
```

#### 计算属性的合理使用
对于依赖多个响应式数据的逻辑，使用计算属性：

```typescript
// ✅ 自动响应依赖变化
const showBuildTool = computed(() => {
  return config.value.type === 'java' || config.value.type === 'tomcat'
})
```

### API设计最佳实践

#### 认证机制的统一处理
所有需要SSH执行的接口都应使用统一的认证验证：

```typescript
// ✅ 推荐：使用 AuthUtils 支持双重认证
import { AuthUtils } from '../utils/AuthUtils';

const sessionId = AuthUtils.getSessionId(req, 'ControllerName');
if (!sessionId) {
  res.status(401).json({ success: false, message: '会话无效' });
  return;
}

// ⚠️ 兼容：直接使用 Session（仅在特殊情况下）
const sessionId = (req.session as any).sessionId;
if (!sessionId) {
  res.status(401).json({ success: false, message: '会话无效' });
  return;
}
```

#### 错误信息的层级设计
API错误信息应该有清晰的层级：

```typescript
// 系统级错误
{ success: false, message: '会话无效' }

// 业务级错误  
{ success: false, message: '模板目录不存在', details: ['path1', 'path2'] }

// 执行级错误
{ success: false, message: '命令执行失败', stderr: '具体错误输出' }
```

### 调试和故障排除

#### 分层调试策略
1. **后端日志**：记录关键执行节点和参数
2. **前端控制台**：显示API调用和状态变化  
3. **Shell脚本输出**：保留详细的执行日志

#### 常见问题模式识别
- **解析失败** → 检查字符串分割和拼接逻辑
- **路径错误** → 验证优先级条件判断
- **超时问题** → 评估任务复杂度，调整轮询策略
- **状态不一致** → 检查异步操作的状态同步
- **认证失败 (401)** → 检查是否使用 `AuthUtils.getSessionId()` 而非直接访问 Session
- **Cookie 冲突** → 优先使用 Token Header 认证，避免 Cookie 依赖
- **Token 过期** → 检查前端 Token 管理和自动刷新逻辑

### Token 认证迁移经验

#### 从 Session 到 Token 的迁移策略
1. **渐进式迁移**：保持 Session 认证兼容，逐步迁移到 Token
2. **统一工具类**：使用 `AuthUtils` 实现双重认证支持
3. **前端适配**：TokenManager 自动管理 Token 生命周期
4. **后端适配**：所有 Controller 统一使用 `AuthUtils.getSessionId()`

#### 解决 Cookie 冲突的最佳实践
- **问题根源**：多系统共享域名导致 Cookie 冲突
- **解决方案**：采用 HTTP Authorization Header 传递认证信息
- **技术优势**：标准化、无冲突、更安全
- **兼容策略**：保留 Cookie 认证作为备用方案

这些经验教训可以避免在后续开发中重复遇到相同的技术陷阱，特别是认证机制相关的问题。

## 前端API客户端Token认证规范

**重要：所有前端API客户端必须正确配置Token Header认证，避免401错误和Cookie冲突问题**

### 1. API客户端分类和配置要求

#### 主要API客户端（推荐方式）
使用统一的 `request.ts` 客户端，自动继承Token认证配置：

```typescript
// ✅ 推荐：使用主要API客户端
import request from './request'

export const someApi = {
  getData: () => request.get('/some/endpoint'),
  postData: (data) => request.post('/some/endpoint', data)
}
```

**适用文件**：
- `applications.ts` - 应用管理API
- `auth.ts` - 认证API
- 其他简单的API封装

#### 独立API客户端（需要完整配置）
创建独立axios实例的API客户端，必须添加完整的Token认证拦截器：

```typescript
// ✅ 正确：独立API客户端的完整配置
import axios from 'axios'
import appConfig from '@/config'
import TokenManager from '@/utils/tokenManager'
import CookieManager from '@/utils/cookie'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  // Token 模式下禁用 Cookie，Cookie 模式下启用
  withCredentials: appConfig.auth.mode === 'cookie'
})

// 请求拦截器 - 添加认证头
api.interceptors.request.use(
  (config) => {
    // 根据配置选择认证方式
    if (appConfig.auth.mode === 'token') {
      // Token 认证方式 - 仅使用 HTTP Header，不使用 Cookie
      const authHeaders = TokenManager.getAuthHeaders()
      Object.assign(config.headers, authHeaders)

      // 确保 Token 模式下不发送 Cookie
      if (appConfig.auth.security?.disableCookies) {
        config.withCredentials = false
      }

      // 调试信息
      console.log('🔑 [API_NAME] API Request (Token Header):', {
        url: config.url,
        method: config.method,
        hasToken: !!TokenManager.getToken(),
        hasSessionId: !!TokenManager.getSessionId()
      })
    } else {
      // Cookie 认证方式（兼容模式）
      const sessionId = CookieManager.getSessionId()
      const authToken = CookieManager.getAuthToken()

      if (sessionId) {
        config.headers['X-DevOps-Session-ID'] = sessionId
      }

      if (authToken) {
        config.headers['Authorization'] = `Bearer ${authToken}`
      }

      // 调试信息
      console.log('[API_NAME] API Request (Cookie):', {
        url: config.url,
        method: config.method,
        sessionId: sessionId ? '***' : 'none',
        authToken: authToken ? '***' : 'none'
      })
    }

    return config
  },
  (error) => {
    console.error('[API_NAME] API Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 调试信息：记录成功响应
    console.log('[API_NAME] API Response:', {
      url: response.config.url,
      status: response.status,
      headers: response.headers,
      data: response.data
    })
    return response.data
  },
  (error) => {
    // 调试信息：记录错误响应
    console.error('[API_NAME] API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })

    if (error.response?.status === 401) {
      console.warn('[API_NAME] API 认证失效，跳转到登录页')

      // 根据认证方式清除相应的认证信息
      if (appConfig.auth.mode === 'token') {
        TokenManager.clearToken()
      } else {
        CookieManager.clearDevOpsCookies()
      }

      // 清除本地会话信息
      localStorage.removeItem('ssh_session')

      // 跳转到登录页
      window.location.href = '/login'
    }

    console.error('[API_NAME]API请求失败:', error)
    return Promise.reject(error)
  }
)
```

**适用文件**：
- `template.ts` - 模板API（需要长超时时间）
- `middleware.ts` - 中间件API
- `deploy.ts` - 部署API（需要长超时时间）
- `workspace.ts` - 工作空间API

### 2. 当前API客户端状态检查清单

#### ✅ 已正确配置的API客户端

| 文件名 | 类型 | 认证配置 | 状态 |
|--------|------|----------|------|
| `request.ts` | 主要客户端 | 完整Token认证拦截器 | ✅ 正确 |
| `applications.ts` | 继承主要客户端 | 使用 `import request` | ✅ 正确 |
| `auth.ts` | 继承主要客户端 | 使用 `import request` | ✅ 正确 |
| `template.ts` | 独立客户端 | 完整Token认证拦截器 | ✅ 已修复 |
| `middleware.ts` | 独立客户端 | 完整Token认证拦截器 | ✅ 已修复 |
| `deploy.ts` | 独立客户端 | 完整Token认证拦截器 | ✅ 已修复 |
| `workspace.ts` | 独立客户端 | 完整Token认证拦截器 | ✅ 已修复 |

### 3. 开发新API客户端的规范

#### 选择API客户端类型

**情况1：简单API封装**
```typescript
// ✅ 推荐：使用主要API客户端
import request from './request'

export const newApi = {
  getData: () => request.get('/new/endpoint'),
  postData: (data) => request.post('/new/endpoint', data)
}
```

**情况2：需要特殊配置（超时时间、baseURL等）**
```typescript
// ✅ 必须：创建独立客户端并添加完整Token认证配置
import axios from 'axios'
// ... 完整的Token认证拦截器配置（参考上面的模板）
```

#### 必须检查的配置项

1. **Token认证拦截器**：
   - ✅ 请求拦截器添加 `Authorization: Bearer <token>` 头
   - ✅ 请求拦截器添加 `X-DevOps-Session-ID` 头
   - ✅ 响应拦截器处理401错误并清除Token

2. **Cookie配置**：
   - ✅ Token模式下设置 `withCredentials: false`
   - ✅ Cookie模式下设置 `withCredentials: true`

3. **调试信息**：
   - ✅ 请求时记录Token状态
   - ✅ 响应时记录状态和错误信息

4. **错误处理**：
   - ✅ 401错误自动清除认证信息
   - ✅ 401错误自动跳转到登录页

### 4. 常见问题和解决方案

#### 问题1：新API客户端返回401错误
**原因**：没有正确配置Token认证拦截器
**解决**：
1. 检查是否添加了请求拦截器
2. 确认 `TokenManager.getAuthHeaders()` 被正确调用
3. 验证 `Authorization` 头是否正确设置

#### 问题2：Cookie冲突导致认证失败
**原因**：独立API客户端没有禁用Cookie
**解决**：
1. 设置 `withCredentials: appConfig.auth.mode === 'cookie'`
2. 在Token模式下确保 `config.withCredentials = false`

#### 问题3：时序问题导致间歇性401错误
**原因**：页面加载时Token还没有完全准备好
**解决**：
1. 确保TokenManager正确管理Token生命周期
2. 添加Token过期检查逻辑
3. 实现自动重试机制

### 5. 验证和测试

#### 开发时验证清单
- [ ] 浏览器开发者工具中确认API请求包含 `Authorization: Bearer <token>` 头
- [ ] 确认没有发送不必要的Cookie（Token模式下）
- [ ] 测试Token过期后的自动跳转功能
- [ ] 验证401错误的正确处理

#### 调试命令
```javascript
// 浏览器控制台中检查Token状态
console.log('Token数据:', JSON.parse(localStorage.getItem('DEVOPS_AUTH_TOKEN') || '{}'))

// 检查API请求头
// 在Network标签中查看请求头是否包含正确的Authorization头
```

### 6. 迁移指南

#### 从Cookie认证迁移到Token认证
1. **保持兼容性**：不要删除现有的Cookie认证代码
2. **逐步迁移**：优先使用Token认证，Cookie认证作为备用
3. **统一工具**：所有新API客户端使用统一的认证配置模板
4. **测试验证**：确保所有API在Token模式下正常工作

这个规范确保了所有前端API客户端都能正确处理Token Header认证，避免401错误和Cookie冲突问题。
