import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';

// 导入路由
import authRoutes from './routes/auth';
import remoteRoutes from './routes/remote';
import workspaceRoutes from './routes/workspace';
import middlewareRoutes from './routes/middleware';
import templateRoutes from './routes/template';
import appRoutes from './routes/app';
import deployRoutes from './routes/deploy';
import applicationRoutes from './routes/applications';

// 导入中间件
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// 导入服务
import { workspaceConfigService } from './services/WorkspaceConfigService';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 基础中间件
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie 解析中间件（用于调试）
app.use((req, res, next) => {
  // 手动解析 Cookie（express-session 会自动处理，这里只是为了调试）
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    req.cookies = {};
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        req.cookies[name] = decodeURIComponent(value);
      }
    });
  }
  next();
});

// Session 中间件 - 使用独特的 Cookie 名称
app.use(session({
  name: 'DEVOPS_SESSION_ID', // 独特的 Cookie 名称，避免与其他系统冲突
  secret: process.env.SESSION_SECRET || 'devops-platform-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS 环境下设为 true
    httpOnly: true, // 防止 XSS 攻击
    maxAge: 30 * 60 * 1000, // 30分钟，与前端配置保持一致
    sameSite: 'lax', // 防止 CSRF 攻击
    path: '/' // Cookie 路径
  }
}));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API 健康检查（前端会调用这个）
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    session: {
      cookieName: 'DEVOPS_SESSION_ID',
      hasSession: !!req.session,
      sessionId: (req.session as any)?.sessionId ? 'exists' : 'none'
    }
  });
});

// 调试中间件
app.use('/api', (req, res, next) => {
  console.log(`API请求: ${req.method} ${req.path}`);
  console.log('请求参数:', req.params);
  console.log('查询参数:', req.query);

  // 调试 Cookie 和 Session 信息
  if (process.env.NODE_ENV !== 'production') {
    console.log('Cookie信息:', {
      devopsSessionId: req.cookies?.DEVOPS_SESSION_ID ? 'exists' : 'none',
      allCookies: Object.keys(req.cookies || {}),
      sessionExists: !!req.session,
      sessionId: (req.session as any)?.sessionId ? 'exists' : 'none'
    });

    // 检查前端发送的自定义头
    const customHeaders = {
      'X-DevOps-Session-ID': req.headers['x-devops-session-id'],
      'Authorization': req.headers['authorization']
    };
    if (Object.values(customHeaders).some(v => v)) {
      console.log('自定义认证头:', customHeaders);
    }
  }

  next();
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/remote', remoteRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:workspace/middleware', middlewareRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/app', appRoutes);
app.use('/api/workspaces/:workspace/deploy', deployRoutes);
app.use('/api/workspaces', applicationRoutes);

// 错误处理中间件
app.use(notFound);
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 DevOps API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  // 清除工作空间配置缓存，确保使用最新配置
  workspaceConfigService.clearAllCache();
  console.log('🔄 工作空间配置缓存已清除');
});

export default app;
