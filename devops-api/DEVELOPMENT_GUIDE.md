# DevOps API 开发规范

## 概述

本文档为 DevOps API TypeScript 项目的开发规范，旨在避免编译错误并提高代码质量。

## TypeScript 配置规范

### 1. 严格模式设置

当前项目使用严格的 TypeScript 配置：
- `strict: true`
- `noImplicitReturns: true`
- `noImplicitAny: true`
- `strictNullChecks: true`

### 2. 编译检查命令

开发时务必使用以下命令检查编译：
```bash
# 仅检查编译，不生成文件
npm run build
# 或
npx tsc --noEmit
```

## Controller 开发规范

### 1. 方法签名规范

```typescript
// ✅ 正确：不要显式指定 Promise<void> 返回类型
async methodName(req: Request, res: Response) {
  // 方法体
}

// ❌ 错误：不要显式指定返回类型
async methodName(req: Request, res: Response): Promise<void> {
  // 会导致编译错误
}
```

### 2. 返回语句规范

由于启用了 `noImplicitReturns`，所有方法必须确保所有代码路径都有返回语句：

```typescript
// ✅ 正确：显式返回
async sampleMethod(req: Request, res: Response) {
  try {
    if (condition) {
      res.status(400).json({ error: 'Bad request' });
      return; // 必须显式返回
    }
    
    res.json({ success: true });
    return; // 必须显式返回
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
    return; // 必须显式返回
  }
}

// ❌ 错误：没有显式返回
async sampleMethod(req: Request, res: Response) {
  if (condition) {
    return res.status(400).json({ error: 'Bad request' }); // 这会导致编译错误
  }
  res.json({ success: true }); // 缺少 return
}
```

### 3. Session 类型访问规范

由于 Express Session 类型扩展问题，使用类型断言：

```typescript
// ✅ 正确：使用类型断言
const sessionId = (req.session as any).sessionId;
(req.session as any).sessionId = newSessionId;

// ❌ 错误：直接访问会编译错误
const sessionId = req.session.sessionId; // TypeScript 编译错误
```

### 4. 错误处理规范

```typescript
// ✅ 正确：标准错误处理模式
async methodName(req: Request, res: Response) {
  try {
    // 参数验证
    if (!param) {
      res.status(400).json({
        success: false,
        message: '参数错误'
      });
      return;
    }

    // 业务逻辑
    const result = await someService.doSomething();
    
    res.json({
      success: true,
      data: result
    });
    return;
  } catch (error: any) {
    console.error('方法执行失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '操作失败'
    });
    return;
  }
}
```

## Service 开发规范

### 1. 类型定义

```typescript
// ✅ 正确：明确的接口定义
interface ServiceParams {
  param1: string;
  param2?: number;
}

interface ServiceResult {
  success: boolean;
  data?: any;
}

class MyService {
  async doSomething(params: ServiceParams): Promise<ServiceResult> {
    // 实现
  }
}

// ❌ 错误：使用 any 类型
async doSomething(params: any): Promise<any> {
  // 应避免使用 any
}
```

### 2. 异步操作

```typescript
// ✅ 正确：Promise 封装
async readRemoteFile(sessionId: string, filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // 异步操作
    someAsyncOperation((err, data) => {
      if (err) {
        reject(new Error(`操作失败: ${err.message}`));
        return;
      }
      resolve(data.toString());
    });
  });
}
```

## 路由定义规范

```typescript
// ✅ 正确：清晰的路由定义
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();
const authController = new AuthController();

// 使用实例方法，确保 this 绑定
router.post('/ssh-login', (req, res) => authController.sshLogin(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

export default router;
```

## 常见编译错误解决方案

### 1. "Not all code paths return a value"

**原因**：`noImplicitReturns: true` 要求所有函数路径都有返回语句
**解决**：在每个分支末尾添加 `return;`

```typescript
// 修复前
if (condition) {
  res.json(data);
}

// 修复后
if (condition) {
  res.json(data);
  return;
}
```

### 2. "Property does not exist on type Session"

**原因**：Express Session 类型定义问题
**解决**：使用类型断言

```typescript
// 修复前
req.session.customProperty = value;

// 修复后  
(req.session as any).customProperty = value;
```

### 3. "Cannot find module" 错误

**原因**：TypeScript 模块解析问题
**解决**：检查 tsconfig.json 中的路径配置

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## 开发流程

### 1. 启动开发服务器
```bash
npm run dev
```

### 2. 编译检查
```bash
npm run build
```

### 3. 类型检查
```bash
npx tsc --noEmit
```

### 4. 修复编译错误的标准步骤
1. 运行 `npx tsc --noEmit` 查看具体错误
2. 根据错误类型应用相应的解决方案
3. 重新检查编译
4. 重启开发服务器验证

## 注意事项

1. **严格遵循返回语句规范**：每个异步方法的所有分支都必须有明确的返回
2. **避免使用 any 类型**：除非是类型断言的特殊情况
3. **及时编译检查**：代码编写完成后立即检查编译错误
4. **统一错误处理**：使用标准的 try-catch 模式
5. **明确的接口定义**：为所有数据结构定义 TypeScript 接口

遵循本规范可以有效避免 TypeScript 编译错误，提高开发效率。