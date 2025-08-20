const express = require('express');
const router = express.Router();
const { exec, spawn } = require('child_process');
const path = require('path');

const DEVOPS_PATH = process.env.DEVOPS_HOME || path.join(__dirname, '../../../');

// 命令生成器
router.post('/generate', (req, res) => {
    try {
        const {
            action = 'run',
            projectType,
            gitUrl,
            svnUrl,
            gitBranch,
            buildTool,
            javaOpts,
            dockerfile,
            template,
            buildCmds,
            buildEnv,
            workspace,
            namespace,
            jobName
        } = req.body;

        if (!projectType || !jobName) {
            return res.status(400).json({ error: 'Project type and job name are required' });
        }

        if (!gitUrl && !svnUrl) {
            return res.status(400).json({ error: 'Git URL or SVN URL is required' });
        }

        let command = `devops ${action} ${projectType}`;

        // 添加版本控制参数
        if (gitUrl) {
            command += ` --git-url ${gitUrl}`;
            if (gitBranch) {
                command += ` --git-branch ${gitBranch}`;
            }
        } else if (svnUrl) {
            command += ` --svn-url ${svnUrl}`;
        }

        // 添加构建参数
        if (buildTool) {
            command += ` --build-tool ${buildTool}`;
        }
        if (javaOpts) {
            command += ` --java-opts "${javaOpts}"`;
        }
        if (dockerfile) {
            command += ` --dockerfile ${dockerfile}`;
        }
        if (template) {
            command += ` --template ${template}`;
        }
        if (buildCmds) {
            command += ` --build-cmds "${buildCmds}"`;
        }
        if (buildEnv) {
            command += ` --build-env ${buildEnv}`;
        }
        if (workspace) {
            command += ` --workspace ${workspace}`;
        }
        if (namespace) {
            command += ` --namespace ${namespace}`;
        }

        // 添加作业名称
        command += ` ${jobName}`;

        res.json({
            command,
            parameters: req.body
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 执行命令
router.post('/execute', (req, res) => {
    try {
        const { command } = req.body;

        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        // 创建执行记录
        const executionId = Date.now().toString();
        const execution = {
            id: executionId,
            command,
            status: 'running',
            startTime: new Date().toISOString(),
            output: [],
            error: null
        };

        // 执行命令
        const child = spawn('bash', ['-c', command], {
            cwd: DEVOPS_PATH,
            env: { ...process.env, PATH: `${DEVOPS_PATH}/bin:${process.env.PATH}` }
        });

        // 处理输出
        child.stdout.on('data', (data) => {
            const output = data.toString();
            execution.output.push({
                type: 'stdout',
                content: output,
                timestamp: new Date().toISOString()
            });
            
            // 广播实时输出
            const { broadcast } = require('../app');
            broadcast({
                type: 'command_output',
                executionId,
                data: { type: 'stdout', content: output }
            });
        });

        child.stderr.on('data', (data) => {
            const output = data.toString();
            execution.output.push({
                type: 'stderr',
                content: output,
                timestamp: new Date().toISOString()
            });
            
            // 广播实时输出
            const { broadcast } = require('../app');
            broadcast({
                type: 'command_output',
                executionId,
                data: { type: 'stderr', content: output }
            });
        });

        child.on('close', (code) => {
            execution.status = code === 0 ? 'success' : 'failed';
            execution.exitCode = code;
            execution.endTime = new Date().toISOString();
            execution.duration = new Date(execution.endTime) - new Date(execution.startTime);

            // 广播执行完成
            const { broadcast } = require('../app');
            broadcast({
                type: 'command_complete',
                executionId,
                data: { status: execution.status, exitCode: code }
            });

            // 保存执行记录
            saveExecution(execution);
        });

        child.on('error', (error) => {
            execution.status = 'error';
            execution.error = error.message;
            execution.endTime = new Date().toISOString();

            // 广播执行错误
            const { broadcast } = require('../app');
            broadcast({
                type: 'command_error',
                executionId,
                data: { error: error.message }
            });

            // 保存执行记录
            saveExecution(execution);
        });

        res.json({
            executionId,
            status: 'started',
            command
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取命令历史
router.get('/history', (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const history = getExecutionHistory(parseInt(limit), parseInt(offset));
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取特定执行记录
router.get('/execution/:id', (req, res) => {
    try {
        const { id } = req.params;
        const execution = getExecution(id);
        
        if (!execution) {
            return res.status(404).json({ error: 'Execution not found' });
        }
        
        res.json(execution);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 验证命令
router.post('/validate', (req, res) => {
    try {
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        // 基本命令验证
        const isValid = command.startsWith('devops ') && command.includes(' ');
        const warnings = [];
        
        if (!command.includes('--git-url') && !command.includes('--svn-url')) {
            warnings.push('No version control URL specified');
        }
        
        if (!command.includes('--workspace')) {
            warnings.push('No workspace specified, will use default');
        }

        res.json({
            valid: isValid,
            warnings,
            command
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 内存中的执行记录存储（生产环境应使用数据库）
let executions = [];

function saveExecution(execution) {
    executions.unshift(execution);
    // 保持最近1000条记录
    if (executions.length > 1000) {
        executions = executions.slice(0, 1000);
    }
}

function getExecutionHistory(limit, offset) {
    return {
        total: executions.length,
        executions: executions.slice(offset, offset + limit)
    };
}

function getExecution(id) {
    return executions.find(exec => exec.id === id);
}

module.exports = router;
