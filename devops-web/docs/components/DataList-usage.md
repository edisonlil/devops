# DataList 组件使用指南

## 概述

DataList 是一个基于应用管理页面设计的通用列表组件，提供了搜索、排序、分页等常用功能，并遵循统一的设计规范。

## 基本用法

### 1. 导入组件

```vue
<script setup lang="ts">
import DataList from '@/components/common/DataList.vue'
</script>
```

### 2. 定义列配置

```typescript
const columns = [
  {
    key: 'name',
    title: '名称',
    width: '180px',
    sortable: true
  },
  {
    key: 'status',
    title: '状态',
    width: '80px',
    sortable: true
  },
  {
    key: 'cpu',
    title: 'CPU',
    width: '200px'
  },
  {
    key: 'memory',
    title: '内存',
    width: '200px'
  },
  {
    key: 'createdAt',
    title: '创建时间',
    width: '150px',
    sortable: true
  },
  {
    key: 'actions',
    title: '操作',
    width: '120px'
  }
]
```

### 3. 准备数据

```typescript
const data = ref([
  {
    id: '1',
    name: 'web-frontend',
    type: 'Vue.js',
    status: 'running',
    cpu: 15,
    memory: 32,
    createdAt: '2025-08-29T17:34:00Z'
  },
  // ... 更多数据
])
```

### 4. 使用组件

```vue
<template>
  <DataList
    :data="data"
    :columns="columns"
    search-placeholder="搜索应用..."
    :search-fields="['name', 'type']"
    empty-title="暂无应用"
    empty-description="点击"部署应用"开始部署第一个应用"
  >
    <!-- 操作按钮插槽 -->
    <template #actions>
      <n-button type="primary" @click="handleDeploy">
        <template #icon>
          <n-icon><Add /></n-icon>
        </template>
        部署应用
      </n-button>
    </template>

    <!-- 自定义状态列 -->
    <template #cell-status="{ item }">
      <div class="status-indicator">
        <div class="status-dot" :class="`status-${item.status}`"></div>
        <span class="status-text">{{ getStatusText(item.status) }}</span>
      </div>
    </template>

    <!-- 自定义CPU列 -->
    <template #cell-cpu="{ item }">
      <div class="resource-info-horizontal">
        <n-progress
          type="line"
          :percentage="item.cpu"
          :height="6"
          :show-indicator="false"
          :color="getResourceColor(item.cpu)"
        />
        <span class="resource-text">{{ item.cpu }}%</span>
      </div>
    </template>

    <!-- 自定义操作列 -->
    <template #cell-actions="{ item }">
      <div class="action-buttons">
        <a class="action-link primary" @click="handleStart(item)">启动</a>
        <a class="action-link" @click="handleDetail(item)">详情</a>
        <n-dropdown :options="getMoreActions(item)">
          <a class="action-link">
            <n-icon><EllipsisHorizontal /></n-icon>
          </a>
        </n-dropdown>
      </div>
    </template>
  </DataList>
</template>
```

## 组件属性

### Props

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| data | Array | [] | 表格数据 |
| columns | Array | [] | 列配置 |
| rowKey | string \| Function | 'id' | 行数据的Key |
| showSearch | boolean | true | 是否显示搜索框 |
| searchPlaceholder | string | '搜索...' | 搜索框占位符 |
| searchFields | Array | [] | 搜索字段，默认为所有列 |
| showPagination | boolean | true | 是否显示分页 |
| pageSize | number | 10 | 每页条数 |
| showSizePicker | boolean | true | 是否显示页面大小选择器 |
| pageSizes | Array | [10, 20, 50] | 页面大小选项 |
| showQuickJumper | boolean | true | 是否显示快速跳转 |
| emptyIcon | string | '📦' | 空状态图标 |
| emptyTitle | string | '暂无数据' | 空状态标题 |
| emptyDescription | string | '当前没有可显示的数据' | 空状态描述 |
| loading | boolean | false | 加载状态 |

### Column 配置

| 属性名 | 类型 | 说明 |
|--------|------|------|
| key | string | 列数据字段名 |
| title | string | 列标题 |
| width | string | 列宽度 |
| sortable | boolean | 是否可排序 |

### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| search | (query: string) | 搜索事件 |
| sort | (field: string, order: 'asc' \| 'desc') | 排序事件 |
| page-change | (page: number) | 页码变化事件 |
| page-size-change | (size: number) | 页面大小变化事件 |

### 插槽

| 插槽名 | 参数 | 说明 |
|--------|------|------|
| actions | - | 操作按钮区域 |
| cell-{key} | { item, value, column } | 自定义列内容 |

## 预设样式类

### 状态指示器
```html
<div class="status-indicator">
  <div class="status-dot status-running"></div>
  <span class="status-text">运行中</span>
</div>
```

可用状态类：
- `status-running` - 运行中（绿色）
- `status-stopped` - 已停机（灰色）
- `status-deploying` - 部署中（蓝色）
- `status-error` - 异常（红色）
- `status-success` - 成功（绿色）
- `status-warning` - 警告（橙色）
- `status-info` - 信息（蓝色）

### 资源使用率
```html
<div class="resource-info-horizontal">
  <n-progress type="line" :percentage="value" />
  <span class="resource-text">{{ value }}%</span>
</div>
```

### 操作按钮
```html
<div class="action-buttons">
  <a class="action-link primary">主要操作</a>
  <a class="action-link">次要操作</a>
  <a class="action-link danger">危险操作</a>
</div>
```

## 预设列宽配置

### 应用管理页面
```css
.table-columns-app {
  grid-template-columns: 180px 80px 200px 200px 150px 120px;
}
```

### 用户管理页面
```css
.table-columns-user {
  grid-template-columns: 200px 120px 150px 120px 150px 100px;
}
```

### 项目管理页面
```css
.table-columns-project {
  grid-template-columns: 220px 100px 150px 120px 150px 120px;
}
```

## 最佳实践

### 1. 列宽设置
- 名称列：180-220px（主要信息需要足够空间）
- 状态列：80px（简短状态文字）
- 资源列：200px（进度条 + 数值显示）
- 时间列：150px（标准时间格式）
- 操作列：100-120px（2-3个操作按钮）

### 2. 搜索字段配置
```typescript
// 推荐配置主要字段进行搜索
searchFields: ['name', 'type', 'description']
```

### 3. 状态显示
使用统一的状态指示器，包含颜色点和文字说明：
```vue
<template #cell-status="{ item }">
  <div class="status-indicator">
    <div class="status-dot" :class="`status-${item.status}`"></div>
    <span class="status-text">{{ getStatusText(item.status) }}</span>
  </div>
</template>
```

### 4. 操作按钮
- 主要操作使用 `primary` 类
- 危险操作使用 `danger` 类
- 更多操作使用下拉菜单

### 5. 响应式适配
组件已内置响应式样式，会在移动端自动隐藏次要列。

## 工具函数示例

```typescript
// 状态文字映射
const getStatusText = (status: string) => {
  const texts = {
    'running': '运行中',
    'stopped': '已停机',
    'deploying': '部署中',
    'error': '异常'
  }
  return texts[status] || status
}

// 资源使用率颜色
const getResourceColor = (percentage: number) => {
  if (percentage < 50) return '#52c41a'
  if (percentage < 80) return '#faad14'
  return '#ff4d4f'
}

// 时间格式化
const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
```
