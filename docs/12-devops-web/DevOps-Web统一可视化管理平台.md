# DevOps-Web 统一可视化管理平台

## 🎯 项目概述

### 背景与目标
- **背景**: 现有DevOps工具以CLI/脚本为主，运维新手使用门槛较高，缺少统一可视化入口来创建/管理模板、管理工作空间、发起与回溯部署作业
- **目标**: 提供一个轻量化、类Sealos风格的Web控制台，结合中间件部署的可视化管理，实现"统一入口、简单易用、功能强大"

### 核心理念
**"工作空间为入口 + 模块化管理 + 可视化配置 + 智能推荐"**

基于Sealos风格的桌面式用户体验，以工作空间为统一入口，提供中间件部署、应用管理、模板管理等模块化功能，同时保持与现有CLI系统的完全兼容性。

## 🏗️ 设计原则

### 1. 可视化优先
- 向导式流程、所见即所得参数表单
- 桌面式应用布局，直观的模块导航
- 实时预览和智能推荐

### 2. 轻量落地
- 前端静态资源 + 极薄后端（仅做文件系统读写、进程调用、日志转发）
- 与现有命令对齐：所有操作均映射到现有`bin/*.sh`、`devops`命令
- 数据直接读写`workspace/`、`templates/`等目录，最大化兼容性

### 3. 工作空间隔离
- 多租户支持，工作空间级别的完全隔离
- 基于工作空间的权限控制和资源管理
- 统一的配置策略和默认值管理

### 4. 安全默认
- 最小权限执行、敏感变量脱敏展示
- 操作审计和历史追踪
- 基于角色的权限控制

## 👥 用户角色

### 运维新手
- 零命令行，通过桌面式界面点击创建/部署/回滚
- 可视化配置表单，智能推荐和验证
- 实时查看部署进度和日志

### 进阶运维/开发
- 自定义模板参数、批量环境管理
- 工作空间级别的配置管理
- 灰度/分批发布（后续迭代）

### 管理员
- 全局模板管理和维护
- 工作空间权限与审计
- 外部平台集成参数维护

## 🎨 界面设计

### 工作空间首页（类似Sealos桌面）

```
┌─────────────────────────────────────────────────────────────┐
│  🐋 DevOps Platform                    💰 0.00  📊 引导 📄 文档 🔧 工具 🔔 👤│
├─────────────────────────────────────────────────────────────┤
│  工作空间                                                    │
│  🏢 Production                                              │
│  🌐 Development                      ▼                      │
│                                                             │
│  ➕ 创建工作空间                                             │
│  ⚙️ 管理工作空间                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │    │
│  │  │ 🔧      │ │ 📧      │ │ �      │ │ 🐙      │   │    │
│  │  │ DevBox  │ │ 应用商店 │ │中间件管理│ │ 应用管理 │   │    │
│  │  │         │ │         │ │         │ │         │   │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │    │
│  │                                                     │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │    │
│  │  │ �      │ │ �      │ │ �      │ │ 🌐      │   │    │
│  │  │ 监控面板 │ │全局模板  │ │ 日志管理 │ │ 网络管理 │   │    │
│  │  │         │ │管理     │ │         │ │         │   │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │    │
│  │                                                     │    │
│  │  ┌─────────┐ ┌─────────┐                           │    │
│  │  │ 💾      │ │ 🔐      │                           │    │
│  │  │ 存储管理 │ │ 权限管理 │                           │    │
│  │  │         │ │         │                           │    │
│  │  └─────────┘ └─────────┘                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 核心模块说明

- **🚀 中间件管理**: 中间件的可视化部署、管理和监控（包含数据库、缓存、消息队列等）
- **🐙 应用管理**: 应用的部署和生命周期管理
- **🔧 全局模板管理**: 模板的创建、编辑和维护
- ~~**📊 监控面板**: 资源监控和性能分析~~ *(本期不做)*
- ~~**💾 存储管理**: 存储卷和备份管理~~ *(本期不做)*
- ~~**🔐 权限管理**: 用户和权限管理~~ *(本期不做)*
- ~~**📝 日志管理**: 日志查看和分析~~ *(本期不做)*
- ~~**🌐 网络管理**: 服务暴露和网络配置~~ *(本期不做)*

## 🔧 功能架构

### 1. 中间件管理模块

#### 用户操作流程
```
选择模板 → 配置参数 → 预览部署 → 执行部署
```

#### 模板选择页面
- 智能分类：按中间件类型分类
  - **数据库类**: MySQL、PostgreSQL、MongoDB、Redis等
  - **消息队列**: Kafka、RabbitMQ、RocketMQ等
  - **搜索引擎**: Elasticsearch、Solr等
  - **缓存系统**: Redis、Memcached等
  - **其他中间件**: Nginx、Tomcat、Zookeeper等
- 难度标识：简单✨、推荐⭐、中级、高级标识
- 搜索过滤：支持名称搜索和多维度过滤
- 工作空间模板：显示工作空间级别的自定义模板

#### 参数配置页面
- 资源滑块：直观的CPU、内存资源选择
- 智能推荐：根据工作空间和集群资源自动推荐配置
- 实时验证：参数输入时实时验证格式和合理性
- 成本预估：实时计算和显示预估成本
- 工作空间默认配置：自动应用工作空间级别的默认配置

#### 部署预览页面
- 配置摘要：清晰展示所有配置信息
- CLI命令：显示等效的命令行操作
- 网络信息：预览连接地址和访问方式
- 一键复制：支持复制CLI命令和连接信息

#### 部署执行页面
- 进度跟踪：实时显示部署进度和状态
- 日志流：实时显示部署日志
- 时间预估：智能预估剩余部署时间
- 错误处理：部署失败时提供详细错误信息和解决建议

### 2. 工作空间管理

#### 工作空间概览
- 显示每个工作空间的中间件数量和状态
- 实时监控运行中和异常的实例数量
- 成本统计和预算控制
- 权限控制：只显示用户有权限访问的工作空间

#### 配置管理
- 可视化编辑工作空间配置和部署文件
- 支持YAML校验、版本记录
- 变量/凭证管理：敏感值脱敏显示
- 默认配置策略：工作空间级别的默认配置

### 3. 全局模板管理

#### 模板中心
- 模板列表：按类型（k8s、swarm、vue、spring-boot等）与来源（全局/空间）过滤与搜索
- 详情与参数：展示关键结构，参数说明与默认值
- 一键创建：向导式填写参数 → 渲染预览 → 选择工作空间 → 落盘

#### 模板编辑器
- 可视化模板编辑器
- 参数定义和验证规则
- 模板预览和测试
- 版本管理和发布

### 4. 部署作业管理

#### 作业执行
- 发起作业：选择模板/工作空间与参数，调用现有命令执行
- 实时日志：WebSocket/SSE转发子进程stdout/stderr
- 历史记录：记录在本地元数据文件中
- 回滚/重试：复用历史参数，调用相应命令执行

#### 集成能力
- Kubernetes：命名空间/服务暴露向导，字段直接映射deploy.yaml
- Harbor：展示镜像仓库与推送信息

## 🏛️ 技术架构

### 前端技术栈
```
Vue 3 + Naive UI + TypeScript + Vite
```

### 目录结构
```
src/
├── views/
│   ├── workspace/
│   │   ├── WorkspaceHome.vue         // 工作空间首页（桌面式）
│   │   └── WorkspaceSettings.vue     // 工作空间设置
│   ├── middleware/
│   │   ├── MiddlewareManager.vue     // 中间件管理主页
│   │   ├── TemplateSelector.vue      // 模板选择页面
│   │   ├── ParameterConfig.vue       // 参数配置页面
│   │   ├── DeployPreview.vue         // 部署预览页面
│   │   └── DeployProgress.vue        // 部署进度页面
│   ├── application/
│   │   └── ApplicationManager.vue    // 应用管理主页
│   └── template/
│       └── GlobalTemplateManager.vue // 全局模板管理
├── components/
│   ├── workspace/
│   │   ├── AppGrid.vue               // 应用网格组件
│   │   └── WorkspaceHeader.vue       // 工作空间头部组件
│   ├── middleware/
│   │   ├── TemplateCard.vue          // 模板卡片组件
│   │   ├── ParameterForm.vue         // 参数表单组件
│   │   └── ResourceSlider.vue        // 资源滑块组件
│   └── common/
│       └── WorkspaceSelector.vue     // 工作空间选择器组件
├── composables/
│   ├── useWorkspace.js               // 工作空间管理
│   ├── useTemplates.js               // 模板管理
│   ├── useDeployment.js              // 部署管理
│   └── useValidation.js              // 参数验证
└── api/
    ├── workspace.js                  // 工作空间API
    ├── middleware.js                 // 中间件API
    └── template.js                   // 模板API
```

### 极薄后端
- **技术选型**: Node.js（Fastify）或 Python（FastAPI）
- **核心功能**:
  - 文件系统操作（读取/写入`workspace/`、`templates/`）
  - 进程执行器（调用`devops`与`bin/*.sh`）
  - 日志流转发（WebSocket/SSE）
  - 轻量元数据索引（本地JSON）

### 存储策略
- 不新增外部数据库；所有配置与状态均写回现有目录
- 作业元数据：`workspace/.devops-web/jobs/*.json`
- 工作空间配置：复用现有`workspace/*/config`结构

## 🔌 API设计

### 工作空间管理
```javascript
GET    /api/workspaces                        // 获取用户可访问的工作空间列表
GET    /api/workspaces/{workspace}/summary    // 获取工作空间概览信息
POST   /api/workspaces                        // 创建新工作空间
GET    /api/workspaces/{workspace}/defaults   // 获取工作空间默认配置
```

### 中间件管理
```javascript
GET    /api/workspaces/{workspace}/middleware/templates              // 获取模板列表
GET    /api/workspaces/{workspace}/middleware/templates/{name}       // 获取模板详情
POST   /api/workspaces/{workspace}/middleware/validate               // 验证配置参数
POST   /api/workspaces/{workspace}/middleware/deploy                 // 执行部署
GET    /api/workspaces/{workspace}/middleware/instances              // 获取实例列表
```

### 模板管理
```javascript
GET    /api/templates                         // 获取全局模板列表
POST   /api/templates                         // 创建新模板
PUT    /api/templates/{id}                    // 更新模板
DELETE /api/templates/{id}                    // 删除模板
```

### 作业管理
```javascript
POST   /api/jobs/deploy                       // 调用命令执行并返回作业id
GET    /api/jobs/{id}                         // 作业状态与元数据
GET    /api/logs/{id}/stream                  // 实时日志流
```

## 🛣️ 路由设计

### 路由结构
```javascript
const routes = [
  {
    path: '/',
    redirect: '/workspace'
  },
  {
    path: '/workspace',
    name: 'WorkspaceHome',
    component: () => import('@/views/workspace/WorkspaceHome.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/workspace/:workspaceName',
    component: () => import('@/layouts/WorkspaceLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'middleware',
        name: 'MiddlewareManager',
        component: () => import('@/views/middleware/MiddlewareManager.vue'),
        children: [
          {
            path: 'deploy/:templateName?',
            name: 'MiddlewareDeploy',
            component: () => import('@/views/middleware/TemplateSelector.vue')
          },
          {
            path: 'config/:templateName/:instanceName?',
            name: 'MiddlewareConfig',
            component: () => import('@/views/middleware/ParameterConfig.vue')
          }
        ]
      },
      {
        path: 'application',
        name: 'ApplicationManager',
        component: () => import('@/views/application/ApplicationManager.vue')
      },
      {
        path: 'template',
        name: 'GlobalTemplateManager',
        component: () => import('@/views/template/GlobalTemplateManager.vue'),
        meta: { requiresPermission: 'admin' }
      },
      // 以下模块暂未实现，后续版本开发
      // {
      //   path: 'monitoring',
      //   name: 'MonitoringDashboard',
      //   component: () => import('@/views/monitoring/MonitoringDashboard.vue')
      // },
      // {
      //   path: 'storage',
      //   name: 'StorageManager',
      //   component: () => import('@/views/storage/StorageManager.vue')
      // },
      // {
      //   path: 'network',
      //   name: 'NetworkManager',
      //   component: () => import('@/views/network/NetworkManager.vue')
      // },
      // {
      //   path: 'permissions',
      //   name: 'PermissionManager',
      //   component: () => import('@/views/permissions/PermissionManager.vue'),
      //   meta: { requiresPermission: 'admin' }
      // }
    ]
  }
]
```

## 🔐 权限与安全

### 权限模型
- **工作空间级权限**: 基于工作空间的访问控制
- **模块级权限**: 不同模块的操作权限控制
- **角色管理**: 支持自定义角色和权限组合

### 安全措施
- 进程执行以受控系统用户运行；限制工作目录为项目根
- 敏感变量只写不读（后续读取为脱敏占位）
- 审计：记录文件写入、命令执行、回滚等关键操作

## 🚀 实施计划

### 功能范围说明

#### 本期实现的核心功能 ✅
- **工作空间管理**: 工作空间首页、切换、基础管理
- **中间件管理**: 完整的中间件部署流程（选择模板→配置参数→预览部署→执行部署）
- **全局模板管理**: 模板的创建、编辑和维护

#### 本期暂不实现的功能 ⏸️
- **监控面板**: 资源监控和性能分析 *(后续版本)*
- **存储管理**: 存储卷和备份管理 *(后续版本)*
- **权限管理**: 用户和权限管理 *(后续版本)*
- **日志管理**: 日志查看和分析 *(后续版本)*
- **网络管理**: 服务暴露和网络配置 *(后续版本)*
- **应用管理**: 应用的部署和生命周期管理 *(后续版本)*

> **注意**: 暂不实现的功能在界面上会显示"暂未实现"标识，点击后提示功能开发中。

### MVP范围与里程碑

#### M1（2-3周）：基础功能 ✅ *本期实现*
- 工作空间首页和模块导航
- 中间件模板只读 + 一键创建基础参数
- 工作空间列表/详情（只读）
- 触发作业与实时日志
- 文件系统读写与最小权限执行

#### M2（3-4周）：核心功能 ✅ *本期实现*
- 中间件参数配置可视化编辑、YAML校验
- 工作空间变量/凭证组（脱敏）
- 部署预览和智能推荐
- 回滚与重试功能
- K8s/Harbor基础信息展示

#### M3（4-6周）：高级功能 ⏸️ *后续版本*
- 全局模板管理和编辑器
- 应用管理模块
- ~~监控面板、存储管理、权限管理、日志管理、网络管理~~ *(暂不实现)*
- 分批/灰度发布 *(后续版本)*
- 定时/Webhook触发 *(后续版本)*
- 工作空间级权限与审计导出 *(后续版本)*

### 验收标准（MVP）
- 通过工作空间首页进入中间件管理，选择Redis/MySQL模板，最少参数即能触发一次部署
- 作业详情可实时查看日志，完成后显示访问入口/端口
- 工作空间详情可查看并下载当前配置，变量/凭证以脱敏方式可视化
- 支持作业一键回滚
- 支持工作空间切换和权限控制

### 成功指标
- 新用户10分钟内完成人生第一次中间件部署 ≥ 70%
- 回滚平均耗时 ≤ 2分钟；回滚成功率 ≥ 95%
- 常见部署相关问询量较CLI模式下降 ≥ 50%
- 工作空间隔离有效性 ≥ 99%

## 🎯 核心优势

### 1. 统一的用户体验
- **桌面式首页**: 类似Sealos的直观桌面体验
- **工作空间上下文**: 始终明确当前操作环境
- **模块化导航**: 清晰的功能模块划分
- **一致的设计语言**: 统一的UI风格和交互模式

### 2. 企业级管理能力
- **多租户隔离**: 工作空间级别的完全隔离
- **权限精细控制**: 基于角色和模块的权限管理
- **资源统一管理**: 中间件、应用、模板的统一管理
- **操作审计追踪**: 完整的操作历史记录

### 3. 开发效率提升
- **模块化架构**: 清晰的代码组织结构
- **组合式API**: 可复用的业务逻辑
- **类型安全**: TypeScript提供的类型检查
- **组件复用**: 高度可复用的UI组件

### 4. 运维友好特性
- **实时监控**: 资源使用和状态监控
- **智能推荐**: 基于最佳实践的配置建议
- **成本控制**: 实时成本预估和预算管理
- **故障诊断**: 详细的日志和错误信息

### 5. 与现有系统完美兼容
- **配置互转**: Web配置可导出为CLI命令，CLI配置可导入到Web
- **模板同步**: 自动同步CLI模板到Web界面
- **一致性保证**: 相同的模板系统和部署逻辑
- **灵活切换**: 用户可根据场景选择Web或CLI方式

---

> **设计理念**: 本方案强调"界面轻、逻辑薄、命令重"。DevOps-Web负责可视化与引导，真实读取/写入仍在`workspace/`、`templates/`等既有目录，执行则复用已有devops命令与脚本，实现零迁移、低成本上线。同时通过工作空间为入口的设计，提供企业级的多租户管理能力。


# UI设计

## 设计原则
- **简洁性**：界面应尽可能简洁，避免不必要的元素。
- **一致性**：保持界面元素的一致性，包括颜色、字体和布局。
- **直观性**：用户应能直观地理解界面功能和操作。
- **响应性**：界面应能适应不同设备和屏幕尺寸。
- **可访问性**：确保所有用户都能轻松访问和使用界面。

## 提示词

### 色彩
- 使用柔和、中性的色调，避免过于鲜艳的颜色。
- 推荐色彩方案：
  - 背景色：#F5F5F5（浅灰色）
  - 文本色：#333（深灰色）
  - 强调色：#007AFF（蓝色）

### 字体
- 选择简洁、易读的字体，如San Francisco或Roboto。
- 字体权重：
  - 标题：Medium
  - 正文：Regular

### 布局
- 采用网格布局，确保元素对齐和间距一致。
- 推荐布局：
  - 12列网格布局
  - 元素间距：16px

### 图标
- 使用简洁、直观的图标，避免复杂的图形。
- 推荐图标库：
  - Material Icons
  - Font Awesome

### 按钮
- 设计扁平化按钮，使用圆角和阴影效果。
- 按钮样式：
  - 背景色：#007AFF
  - 文本色：白色
  - 圆角：8px
  - 阴影：轻微阴影效果

### 交互
- 提供清晰的反馈，如按钮点击效果和加载动画。

### 导航
- 使用清晰的导航栏和标签，方便用户切换。
- 导航栏：
  - 固定顶部
  - 包含Logo、菜单和搜索框

### 空白区域
- 合理利用空白区域，避免界面过于拥挤。

### 动画
- 使用平滑、自然的动画效果，增强用户体验。
- 动画效果：
  - CSS过渡效果
  - 按钮点击时的背景色变化和阴影效果

### 可读性
- 确保文本对比度足够，易于阅读。

通过这些设计原则和提示词，可以构建一个简洁、高级且注重用户体验的UI设计。