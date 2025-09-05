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

// 导入中间件
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// 基础中间件
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session 中间件
app.use(session({
  secret: process.env.SESSION_SECRET || 'devops-platform-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 2 * 60 * 60 * 1000 // 2小时
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

// 调试中间件
app.use('/api', (req, res, next) => {
  console.log(`API请求: ${req.method} ${req.path}`);
  console.log('请求参数:', req.params);
  console.log('查询参数:', req.query);
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

// 错误处理中间件
app.use(notFound);
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 DevOps API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
