# 列表设计规范指南

## 概述

本文档基于应用管理页面的列表设计，总结了系统中列表组件的统一设计规范，旨在确保所有列表页面的一致性和可维护性。

## 设计原则

### 1. 一致性
- 所有列表页面使用统一的布局结构
- 保持相同的视觉层次和间距规范
- 统一的交互模式和状态反馈

### 2. 可扫描性
- 清晰的信息层次，重要信息突出显示
- 合理的行高和间距，便于快速扫描
- 状态信息使用视觉化指示器

### 3. 响应式设计
- 适配不同屏幕尺寸
- 移动端优化显示
- 渐进式信息展示

## 布局结构

### 页面整体布局
```
┌─────────────────────────────────────┐
│ 页面标题区域 (page-header)            │
├─────────────────────────────────────┤
│ 搜索和操作区域 (search-section)       │
├─────────────────────────────────────┤
│ 列表容器 (table-container)           │
│ ├─ 表头 (table-header)              │
│ ├─ 表体 (table-body)                │
│ │  ├─ 数据行 (table-row)            │
│ │  └─ 空状态 (empty-state)          │
│ └─ 分页 (pagination-section)        │
└─────────────────────────────────────┘
```

### 核心组件结构

#### 1. 页面标题区域 (.page-header)
- **用途**: 展示页面标题和描述
- **布局**: Flex布局，左侧标题，右侧操作按钮
- **样式**: 32px底部间距，4px左右内边距

#### 2. 搜索和操作区域 (.search-section)
- **用途**: 搜索输入框和主要操作按钮
- **布局**: Flex布局，两端对齐
- **组件**: 搜索框(300px宽) + 主操作按钮
- **间距**: 20px底部间距

#### 3. 表格容器 (.table-container)
- **背景**: 白色背景 (#FFFFFF)
- **边框**: 1px solid #F0F0F0
- **圆角**: 8px
- **阴影**: 0 1px 3px rgba(0, 0, 0, 0.08)

## 表格设计规范

### 表头设计 (.table-header)
- **布局**: CSS Grid布局，支持灵活列宽配置
- **高度**: 最小48px
- **内边距**: 16px 0 16px 24px
- **背景**: 白色 (#FFFFFF)
- **边框**: 底部1px solid #F0F0F0
- **字体**: 13px, 半粗体(600), 主要文字色

### 数据行设计 (.table-row)
- **布局**: CSS Grid布局，与表头对齐
- **高度**: 最小60px
- **内边距**: 16px 0 16px 24px
- **背景**: 白色，悬停时#F8F9FA
- **边框**: 底部1px solid #F5F5F5
- **过渡**: 0.2s ease

### 列宽配置标准
基于应用管理页面的最佳实践：
```css
grid-template-columns: 180px 80px 200px 200px 150px 120px;
```
- **名称列**: 180px (主要信息，需要足够空间)
- **状态列**: 80px (简短状态文字)
- **资源列**: 200px (进度条 + 数值)
- **时间列**: 150px (标准时间格式)
- **操作列**: 120px (2-3个操作按钮)

## 内容组件规范

### 1. 状态指示器 (.status-indicator)
```html
<div class="status-indicator">
  <div class="status-dot status-running"></div>
  <span class="status-text">运行中</span>
</div>
```

**状态颜色标准**:
- 运行中: #52C41A (绿色)
- 已停机: #BFBFBF (灰色)
- 部署中: #1890FF (蓝色)
- 异常: #FF4D4F (红色)

### 2. 资源使用率 (.resource-info-horizontal)
```html
<div class="resource-info-horizontal">
  <n-progress type="line" :percentage="value" />
  <span class="resource-text">{{ value }}%</span>
</div>
```

**颜色阈值**:
- < 50%: #52c41a (绿色)
- 50-80%: #faad14 (橙色)
- > 80%: #ff4d4f (红色)

### 3. 操作按钮组 (.action-buttons)
```html
<div class="action-buttons">
  <a class="action-link primary">主要操作</a>
  <a class="action-link">次要操作</a>
  <n-dropdown>更多操作</n-dropdown>
</div>
```

**操作链接样式**:
- 字体大小: 12px
- 颜色: #1890FF
- 悬停: #40a9ff + 下划线
- 间距: 12px

## 空状态设计

### 空状态组件 (.empty-state)
```html
<div class="empty-state">
  <div class="empty-content">
    <div class="empty-icon">📦</div>
    <div class="empty-title">暂无应用</div>
    <div class="empty-description">点击"部署应用"开始部署第一个应用</div>
  </div>
</div>
```

**设计要素**:
- 图标: 48px大小，相关emoji或图标
- 标题: 18px, 粗体(600), 主要文字色
- 描述: 14px, 次要文字色, 1.5行高

## 分页组件

### 分页区域 (.pagination-section)
- **位置**: 表格底部，居中对齐
- **间距**: 24px顶部间距
- **配置**: 显示页码选择器、快速跳转
- **页面大小选项**: [10, 20, 50]

## 响应式断点

### 移动端适配 (≤768px)
- 搜索区域改为垂直布局
- 表格列数减少，隐藏次要信息
- 操作按钮垂直排列

### 小屏幕适配 (≤480px)
- 只显示核心列：名称、状态、操作
- 隐藏资源使用率和时间列
- 减小内边距和字体大小

## CSS变量系统

### 字体规范
```css
--font-size-h1: 32px;        /* 页面主标题 */
--font-size-body: 14px;      /* 正文内容 */
--font-size-caption: 13px;   /* 说明文字 */
--font-size-small: 12px;     /* 小字 */

--font-weight-semibold: 600; /* 半粗体 */
--font-weight-regular: 400;  /* 常规 */
```

### 颜色规范
```css
--text-primary: #1d1d1f;     /* 主要文字 */
--text-secondary: #86868b;   /* 次要文字 */
--text-tertiary: #c7c7cc;    /* 三级文字 */
```

## 最佳实践

### 1. 信息层次
- 主要信息使用较大字体和深色
- 次要信息使用较小字体和浅色
- 状态信息使用颜色和图标强化

### 2. 交互反馈
- 悬停状态提供视觉反馈
- 排序状态使用图标指示
- 加载状态使用骨架屏或加载指示器

### 3. 性能优化
- 使用虚拟滚动处理大量数据
- 合理的分页大小设置
- 防抖搜索输入

### 4. 可访问性
- 合理的颜色对比度
- 键盘导航支持
- 屏幕阅读器友好的标签

## 组件复用指南

### 使用统一样式类
所有列表页面应使用 `table.css` 中定义的样式类，确保视觉一致性。

### 自定义扩展
如需自定义样式，应在组件内部使用scoped样式，避免影响全局样式。

### 组件化开发
推荐使用可配置的通用列表组件，通过props传递列配置和数据。

## 相关文件

### 核心文件
- `src/components/common/DataList.vue` - 通用列表组件
- `src/styles/table.css` - 统一表格样式
- `docs/components/DataList-usage.md` - 组件使用文档
- `src/components/examples/DataListExample.vue` - 使用示例

### 参考实现
- `src/views/application/ApplicationManager.vue` - 应用管理页面（设计原型）
- `src/components/application/ApplicationList.vue` - 应用列表组件
- `src/components/common/DataTable.vue` - 原有表格组件

## 迁移指南

### 从现有页面迁移到新组件

1. **替换组件引用**
```vue
<!-- 旧的实现 -->
<div class="table-container">
  <div class="table-header">...</div>
  <div class="table-body">...</div>
</div>

<!-- 新的实现 -->
<DataList :data="data" :columns="columns">
  <template #cell-status="{ item }">...</template>
</DataList>
```

2. **配置列定义**
```typescript
// 将现有的列结构转换为配置
const columns = [
  { key: 'name', title: '名称', width: '180px', sortable: true },
  { key: 'status', title: '状态', width: '80px' },
  // ...
]
```

3. **迁移自定义内容**
使用插槽替换原有的自定义渲染逻辑。

### 样式兼容性
新的样式系统向后兼容，现有页面可以逐步迁移。

## 总结

通过统一的列表设计规范和可复用的DataList组件，我们实现了：

1. **设计一致性** - 所有列表页面遵循相同的视觉规范
2. **开发效率** - 减少重复代码，提高开发速度
3. **维护性** - 集中管理样式和功能，便于维护和更新
4. **扩展性** - 灵活的插槽系统支持各种自定义需求
5. **响应式** - 内置移动端适配，无需额外开发

建议在新的列表页面开发中优先使用DataList组件，并逐步将现有页面迁移到新的设计规范。
