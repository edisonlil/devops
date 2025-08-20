const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
const WebSocket = require('ws');
const http = require('http');

// 尝试加载数据库，如果失败则使用内存存储
let database = null;
try {
    database = require('./models/database');
} catch (error) {
    console.log('SQLite3 not available, using in-memory storage');
    database = null;
}

// 设置字符编码
process.env.LANG = 'zh_CN.UTF-8';
process.env.LC_ALL = 'zh_CN.UTF-8';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 设置响应头确保UTF-8编码
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// 静态文件服务 - 只在构建文件存在时启用
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    console.log('Static files served from:', distPath);
} else {
    console.log('Frontend dist folder not found, static file serving disabled');
}

// DevOps项目路径
const DEVOPS_PATH = process.env.DEVOPS_HOME || path.join(__dirname, '../../');
const WORKSPACE_PATH = path.join(DEVOPS_PATH, 'workspace');

// WebSocket连接管理
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
        clients.delete(ws);
        console.log('WebSocket client disconnected');
    });
});

// 广播消息到所有客户端
function broadcast(message) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// 路由
const workspaceRoutes = require('./routes/workspace');
const configRoutes = require('./routes/config');
const commandRoutes = require('./routes/command');
const deployRoutes = require('./routes/deploy');
const toolsRoutes = require('./routes/tools');
const jobsRoutes = require('./routes/jobs');
const templatesRoutes = require('./routes/templates');

// 健康检查API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        devopsPath: DEVOPS_PATH,
        workspacePath: WORKSPACE_PATH
    });
});

// 添加请求日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// API 路由
app.use('/api/workspace', workspaceRoutes);
app.use('/api/config', configRoutes);
app.use('/api/command', commandRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/templates', templatesRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        devopsPath: DEVOPS_PATH,
        workspacePath: WORKSPACE_PATH
    });
});

// 获取系统信息
app.get('/api/system/info', (req, res) => {
    const { exec } = require('child_process');
    
    exec('devops -v', { cwd: DEVOPS_PATH }, (error, stdout, stderr) => {
        const version = error ? 'Unknown' : stdout.trim();
        
        res.json({
            version,
            devopsPath: DEVOPS_PATH,
            workspacePath: WORKSPACE_PATH,
            nodeVersion: process.version,
            platform: process.platform
        });
    });
});

// SPA路由处理 - 只处理非API路由
app.get('*', (req, res) => {
    // 如果是API请求，不要处理
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            error: 'API endpoint not found',
            path: req.path
        });
    }

    const indexPath = path.join(__dirname, '../frontend/dist/index.html');

    // 检查文件是否存在
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // 如果构建文件不存在，返回开发模式提示
        res.status(404).json({
            error: 'Frontend not built',
            message: '前端应用尚未构建，请运行 npm run build 或在开发模式下访问前端服务',
            suggestion: '开发模式请访问: http://localhost:5173'
        });
    }
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 初始化数据库并启动服务器
async function startServer() {
    try {
        if (database) {
            await database.init();
            console.log('Database initialized successfully');
        } else {
            console.log('Using in-memory storage (SQLite3 not available)');
        }

        server.listen(PORT, HOST, () => {
            console.log(`DevOps Web Server running on http://${HOST}:${PORT}`);
            console.log(`DevOps Path: ${DEVOPS_PATH}`);
            console.log(`Workspace Path: ${WORKSPACE_PATH}`);
            console.log(`Access from any IP: http://YOUR_SERVER_IP:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// 优雅关闭
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    if (database) {
        await database.close();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    if (database) {
        await database.close();
    }
    process.exit(0);
});

// 导出broadcast函数供其他模块使用
module.exports = { app, broadcast };
