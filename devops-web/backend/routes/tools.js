const express = require('express');
const router = express.Router();
const { exec, spawn } = require('child_process');
const path = require('path');

const DEVOPS_PATH = process.env.DEVOPS_HOME || path.join(__dirname, '../../../');

// 支持的工具列表
const SUPPORTED_TOOLS = [
    { name: 'git', category: 'basic', description: '版本控制系统' },
    { name: 'curl', category: 'basic', description: 'HTTP客户端工具' },
    { name: 'wget', category: 'basic', description: '文件下载工具' },
    { name: 'unzip', category: 'basic', description: '解压缩工具' },
    { name: 'docker', category: 'container', description: '容器运行时' },
    { name: 'docker-compose', category: 'container', description: '容器编排工具' },
    { name: 'kubectl', category: 'kubernetes', description: 'Kubernetes命令行工具' },
    { name: 'helm', category: 'kubernetes', description: 'Kubernetes包管理器' },
    { name: 'java', category: 'java', description: 'Java运行时环境' },
    { name: 'maven', category: 'java', description: 'Java项目管理工具' },
    { name: 'gradle', category: 'java', description: 'Java构建工具' },
    { name: 'node', category: 'nodejs', description: 'Node.js运行时' },
    { name: 'npm', category: 'nodejs', description: 'Node.js包管理器' },
    { name: 'yarn', category: 'nodejs', description: 'Node.js包管理器' },
    { name: 'go', category: 'other', description: 'Go语言编译器' },
    { name: 'expect', category: 'other', description: '自动化交互工具' }
];

// 获取支持的工具列表
router.get('/supported', (req, res) => {
    res.json({
        tools: SUPPORTED_TOOLS,
        categories: {
            basic: '基础工具',
            container: '容器工具',
            kubernetes: 'Kubernetes工具',
            java: 'Java工具',
            nodejs: 'Node.js工具',
            other: '其他工具'
        }
    });
});

// 检查环境状态
router.get('/check', (req, res) => {
    const command = 'devops install-tools --check';
    
    exec(command, {
        cwd: DEVOPS_PATH,
        env: { ...process.env, PATH: `${DEVOPS_PATH}/bin:${process.env.PATH}` }
    }, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({
                error: error.message,
                stderr: stderr
            });
        }

        // 解析输出
        const lines = stdout.split('\n');
        const tools = [];
        let currentSection = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes('✓')) {
                const toolName = trimmed.replace(/.*✓\s+/, '').trim();
                tools.push({
                    name: toolName,
                    status: 'installed',
                    category: getToolCategory(toolName)
                });
            } else if (trimmed.includes('✗')) {
                const toolName = trimmed.replace(/.*✗\s+/, '').trim();
                tools.push({
                    name: toolName,
                    status: 'missing',
                    category: getToolCategory(toolName)
                });
            }
        }

        const installed = tools.filter(t => t.status === 'installed');
        const missing = tools.filter(t => t.status === 'missing');

        res.json({
            summary: {
                total: tools.length,
                installed: installed.length,
                missing: missing.length
            },
            tools,
            installed,
            missing,
            output: stdout
        });
    });
});

// 安装工具
router.post('/install', (req, res) => {
    try {
        const { tools, all, javaVersion } = req.body;

        let command = 'devops install-tools';

        if (all) {
            command += ' --all';
        } else if (tools && tools.length > 0) {
            command += ` --tools ${tools.join(',')}`;
        } else {
            return res.status(400).json({ error: 'No tools specified' });
        }

        if (javaVersion) {
            command += ` --java-version ${javaVersion}`;
        }

        // 创建安装记录
        const installationId = Date.now().toString();
        const installation = {
            id: installationId,
            command,
            tools: tools || [],
            all: !!all,
            javaVersion,
            status: 'running',
            startTime: new Date().toISOString(),
            output: [],
            error: null
        };

        // 执行安装命令
        const child = spawn('bash', ['-c', command], {
            cwd: DEVOPS_PATH,
            env: { ...process.env, PATH: `${DEVOPS_PATH}/bin:${process.env.PATH}` }
        });

        // 处理输出
        child.stdout.on('data', (data) => {
            const output = data.toString();
            installation.output.push({
                type: 'stdout',
                content: output,
                timestamp: new Date().toISOString()
            });
            
            // 广播实时输出
            const { broadcast } = require('../app');
            broadcast({
                type: 'tool_install_output',
                installationId,
                data: { type: 'stdout', content: output }
            });
        });

        child.stderr.on('data', (data) => {
            const output = data.toString();
            installation.output.push({
                type: 'stderr',
                content: output,
                timestamp: new Date().toISOString()
            });
            
            // 广播实时输出
            const { broadcast } = require('../app');
            broadcast({
                type: 'tool_install_output',
                installationId,
                data: { type: 'stderr', content: output }
            });
        });

        child.on('close', (code) => {
            installation.status = code === 0 ? 'success' : 'failed';
            installation.exitCode = code;
            installation.endTime = new Date().toISOString();
            installation.duration = new Date(installation.endTime) - new Date(installation.startTime);

            // 广播安装完成
            const { broadcast } = require('../app');
            broadcast({
                type: 'tool_install_complete',
                installationId,
                data: { status: installation.status, exitCode: code }
            });

            // 保存安装记录
            saveInstallation(installation);
        });

        child.on('error', (error) => {
            installation.status = 'error';
            installation.error = error.message;
            installation.endTime = new Date().toISOString();

            // 广播安装错误
            const { broadcast } = require('../app');
            broadcast({
                type: 'tool_install_error',
                installationId,
                data: { error: error.message }
            });

            // 保存安装记录
            saveInstallation(installation);
        });

        res.json({
            installationId,
            status: 'started',
            command,
            tools: tools || []
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取安装历史
router.get('/install/history', (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const history = getInstallationHistory(parseInt(limit), parseInt(offset));
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取特定安装记录
router.get('/install/:id', (req, res) => {
    try {
        const { id } = req.params;
        const installation = getInstallation(id);
        
        if (!installation) {
            return res.status(404).json({ error: 'Installation not found' });
        }
        
        res.json(installation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取工具分类
function getToolCategory(toolName) {
    const tool = SUPPORTED_TOOLS.find(t => t.name === toolName);
    return tool ? tool.category : 'unknown';
}

// 内存中的安装记录存储
let installations = [];

function saveInstallation(installation) {
    installations.unshift(installation);
    // 保持最近100条记录
    if (installations.length > 100) {
        installations = installations.slice(0, 100);
    }
}

function getInstallationHistory(limit, offset) {
    return {
        total: installations.length,
        installations: installations.slice(offset, offset + limit)
    };
}

function getInstallation(id) {
    return installations.find(inst => inst.id === id);
}

module.exports = router;
