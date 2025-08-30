# DevOps API 接口文档

## 基础信息

- **Base URL**: `http://localhost:8080`
- **Content-Type**: `application/json`
- **认证方式**: Bearer Token (如果启用)

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

## 健康检查

### GET /health
检查服务状态

**响应示例:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## 工作空间管理

### GET /workspaces
获取工作空间列表

**响应示例:**
```json
{
  "success": true,
  "data": {
    "workspaces": [
      {
        "name": "default",
        "displayName": "默认工作空间",
        "description": "系统默认工作空间",
        "middlewareCount": 5,
        "runningCount": 3,
        "errorCount": 0,
        "totalCost": 156.80,
        "lastActivity": "2024-01-01T00:00:00.000Z",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### POST /workspaces
创建工作空间

**请求体:**
```json
{
  "name": "my-workspace",
  "displayName": "我的工作空间",
  "description": "工作空间描述"
}
```

### GET /workspaces/:name
获取工作空间详情

### PUT /workspaces/:name
更新工作空间

### DELETE /workspaces/:name
删除工作空间

### GET /workspaces/:name/summary
获取工作空间概览信息

**响应示例:**
```json
{
  "success": true,
  "data": {
    "workspace": "default",
    "overview": {
      "totalInstances": 10,
      "runningInstances": 8,
      "errorInstances": 1,
      "totalCost": 256.50,
      "lastDeployment": "2024-01-01T00:00:00.000Z"
    },
    "resources": {
      "cpu": {
        "used": 2.5,
        "total": 8.0,
        "unit": "cores"
      },
      "memory": {
        "used": 4096,
        "total": 16384,
        "unit": "MB"
      },
      "storage": {
        "used": 50,
        "total": 200,
        "unit": "GB"
      }
    },
    "recentActivities": [
      {
        "id": "activity-1",
        "type": "deploy",
        "resource": "mysql-instance",
        "status": "success",
        "message": "MySQL 实例部署成功",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "user": "admin"
      }
    ]
  }
}
```

## 中间件管理

### GET /workspaces/:workspace/middleware
获取中间件实例列表

**查询参数:**
- `type`: 中间件类型 (mysql, redis, mongodb, etc.)
- `status`: 状态筛选 (running, stopped, error)
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)

**响应示例:**
```json
{
  "success": true,
  "data": {
    "instances": [
      {
        "id": "mysql-001",
        "name": "主数据库",
        "type": "mysql",
        "version": "8.0",
        "status": "running",
        "resources": {
          "cpu": "1 core",
          "memory": "2GB",
          "storage": "20GB"
        },
        "endpoint": "mysql-001.default.svc.cluster.local:3306",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

### POST /workspaces/:workspace/middleware
创建中间件实例

**请求体:**
```json
{
  "name": "my-mysql",
  "type": "mysql",
  "version": "8.0",
  "config": {
    "cpu": "1",
    "memory": "2Gi",
    "storage": "20Gi",
    "rootPassword": "password123"
  }
}
```

### GET /workspaces/:workspace/middleware/:id
获取中间件实例详情

### PUT /workspaces/:workspace/middleware/:id
更新中间件实例

### DELETE /workspaces/:workspace/middleware/:id
删除中间件实例

### POST /workspaces/:workspace/middleware/:id/start
启动中间件实例

### POST /workspaces/:workspace/middleware/:id/stop
停止中间件实例

### POST /workspaces/:workspace/middleware/:id/restart
重启中间件实例

## 模板管理

### GET /templates
获取模板列表

**查询参数:**
- `type`: 模板类型
- `category`: 模板分类

### POST /templates
创建模板

### GET /templates/:id
获取模板详情

### PUT /templates/:id
更新模板

### DELETE /templates/:id
删除模板

## 错误码说明

| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 资源冲突 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 503 | 服务不可用 |

## 状态码说明

### 中间件状态
- `pending`: 创建中
- `running`: 运行中
- `stopped`: 已停止
- `error`: 错误状态
- `updating`: 更新中
- `deleting`: 删除中

### 工作空间状态
- `active`: 活跃
- `inactive`: 非活跃
- `error`: 错误状态
