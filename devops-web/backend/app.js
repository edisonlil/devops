const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../frontend/dist')));

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

app.use('/api/workspace', workspaceRoutes);
app.use('/api/config', configRoutes);
app.use('/api/command', commandRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/tools', toolsRoutes);

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

// SPA路由处理
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
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

server.listen(PORT, () => {
    console.log(`DevOps Web Server running on port ${PORT}`);
    console.log(`DevOps Path: ${DEVOPS_PATH}`);
    console.log(`Workspace Path: ${WORKSPACE_PATH}`);
});

// 导出broadcast函数供其他模块使用
module.exports = { app, broadcast };
