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

**DevOps API** 运行在 `localhost:8080`，提供RESTful API服务：
- 健康检查：`GET /health`
- 所有业务接口都以 `/api` 开头
- 支持CORS，允许前端跨域请求
- 使用Express Session进行会话管理

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

4. **会话管理**：
   - API使用Express Session，需要 `withCredentials: true`
   - 前端响应拦截器处理401跳转登录页
   - Session过期时间为2小时

5. **开发端口**：
   - API服务：固定端口 8080
   - Web服务：Vite自动分配端口（3000、3001、3002等）

### API接口分类

- **认证接口** (`/api/auth/*`): SSH登录、会话管理、权限检查
- **远程主机** (`/api/remote/*`): 远程工作空间、连接状态检查
- **工作空间** (`/api/workspaces/*`): 本地工作空间管理、配置读写
- **中间件部署** (`/api/workspaces/:workspace/middleware/*`): 模板管理、部署执行
- **应用部署** (`/api/workspaces/:workspace/deploy/*`): DevOps命令执行、部署历史

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

3. **Session类型访问**
    ```typescript
    // ✅ 正确：使用类型断言
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
    async methodName(req: Request, res: Response) {
      try {
        // 参数验证
        if (!param) {
          res.status(400).json({ success: false, message: '参数错误' });
          return;
        }
        
        // 业务逻辑
        const result = await service.doSomething();
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
