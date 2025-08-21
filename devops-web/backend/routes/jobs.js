const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 工作空间目录路径
const WORKSPACE_DIR = path.join(__dirname, '../../workspace');

// 获取工作空间的作业列表

router.get('/', async (req, res) => {
    try {
        const { workspace } = req.query;

        if (!workspace) {
            return res.status(400).json({
                success: false,
                message: '缺少必需参数: workspace'
            });
        }

        const workspaceDir = path.join(WORKSPACE_DIR, workspace);
        const jobsDir = path.join(workspaceDir, 'jobs');

        if (!fs.existsSync(jobsDir)) {
            return res.json({
                success: true,
                data: {
                    jobs: [],
                    total: 0
                }
            });
        }

        const jobs = [];
        const jobDirs = fs.readdirSync(jobsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const jobName of jobDirs) {
            const jobDir = path.join(jobsDir, jobName);
            const jobConfigPath = path.join(jobDir, 'job.json');

            if (fs.existsSync(jobConfigPath)) {
                try {
                    const jobConfig = JSON.parse(fs.readFileSync(jobConfigPath, 'utf8'));

                    // 检查文件状态
                    const files = {};
                    const expectedFiles = ['dockerfile', 'deploy.yaml'];

                    for (const fileName of expectedFiles) {
                        const filePath = path.join(jobDir, fileName);
                        files[fileName] = {
                            exists: fs.existsSync(filePath),
                            size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
                            lastModified: fs.existsSync(filePath) ? fs.statSync(filePath).mtime : null
                        };
                    }

                    jobs.push({
                        ...jobConfig,
                        files: files,
                        path: jobDir
                    });
                } catch (error) {
                    console.error(`Error loading job ${jobName}:`, error.message);
                }
            }
        }

        // 按创建时间排序
        jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            data: {
                jobs: jobs,
                total: jobs.length
            }
        });

    } catch (error) {
        console.error('获取作业列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取作业列表失败',
            error: error.message
        });
    }
});

// 获取单个作业详情
router.get('/:jobId', async (req, res) => {
    try {
        initSampleJobs();
        const { jobId } = req.params;
        
        const job = jobsStorage.get(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: '作业不存在'
            });
        }
        
        res.json(job);
    } catch (error) {
        console.error('获取作业详情失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取作业详情失败',
            error: error.message 
        });
    }
});

// 创建新作业
router.post('/', async (req, res) => {
    try {
        const { workspaceId, name, templateId, gitUrl, branch, buildPath, deployParams } = req.body;

        // 验证必填字段
        if (!workspaceId || !name || !templateId || !gitUrl || !branch) {
            return res.status(400).json({
                success: false,
                message: '缺少必填字段'
            });
        }

        // 生成作业ID
        const jobId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // 检查作业是否已存在
        if (jobsStorage.has(jobId)) {
            return res.status(409).json({
                success: false,
                message: '作业名称已存在'
            });
        }

        const job = {
            id: jobId,
            workspaceId,
            name,
            templateId,
            gitUrl,
            branch,
            buildPath: buildPath || './',
            status: 'pending',
            deployParams: deployParams || [],
            createdAt: new Date(),
            lastDeploy: null
        };

        jobsStorage.set(jobId, job);

        res.status(201).json({
            success: true,
            message: '作业创建成功',
            data: job
        });
    } catch (error) {
        console.error('创建作业失败:', error);
        res.status(500).json({
            success: false,
            message: '创建作业失败',
            error: error.message
        });
    }
});

// 更新作业
router.put('/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const updates = req.body;
        
        const job = jobsStorage.get(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: '作业不存在'
            });
        }
        
        // 更新作业信息
        const updatedJob = {
            ...job,
            ...updates,
            id: jobId, // 确保ID不被修改
            updatedAt: new Date()
        };
        
        jobsStorage.set(jobId, updatedJob);
        
        res.json({
            success: true,
            message: '作业更新成功',
            data: updatedJob
        });
    } catch (error) {
        console.error('更新作业失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '更新作业失败',
            error: error.message 
        });
    }
});

// 删除作业
router.delete('/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        if (!jobsStorage.has(jobId)) {
            return res.status(404).json({
                success: false,
                message: '作业不存在'
            });
        }
        
        jobsStorage.delete(jobId);
        
        res.json({
            success: true,
            message: '作业删除成功'
        });
    } catch (error) {
        console.error('删除作业失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '删除作业失败',
            error: error.message 
        });
    }
});

// 重新部署作业
router.post('/:jobId/redeploy', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const job = jobsStorage.get(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: '作业不存在'
            });
        }
        
        // 更新作业状态为运行中
        job.status = 'running';
        job.lastDeploy = new Date();
        jobsStorage.set(jobId, job);
        
        // 模拟部署过程（实际项目中这里会调用部署逻辑）
        setTimeout(() => {
            job.status = Math.random() > 0.2 ? 'success' : 'failed';
            jobsStorage.set(jobId, job);
        }, 5000);
        
        res.json({
            success: true,
            message: '重新部署已启动',
            data: job
        });
    } catch (error) {
        console.error('重新部署失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '重新部署失败',
            error: error.message 
        });
    }
});

// 获取作业日志
router.get('/:jobId/logs', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const job = jobsStorage.get(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: '作业不存在'
            });
        }
        
        // 模拟日志数据
        const logs = [
            { timestamp: new Date(), level: 'INFO', message: '开始构建...' },
            { timestamp: new Date(), level: 'INFO', message: '拉取代码成功' },
            { timestamp: new Date(), level: 'INFO', message: '构建镜像中...' },
            { timestamp: new Date(), level: 'INFO', message: '推送镜像到仓库' },
            { timestamp: new Date(), level: 'INFO', message: '部署到目标环境' },
            { timestamp: new Date(), level: 'INFO', message: '部署完成' }
        ];
        
        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('获取日志失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取日志失败',
            error: error.message 
        });
    }
});

// 获取部署历史
router.get('/:jobId/history', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const job = jobsStorage.get(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: '作业不存在'
            });
        }
        
        // 模拟部署历史数据
        const history = [
            {
                id: '1',
                title: '部署到生产环境',
                description: '版本 v1.2.3 部署成功',
                status: 'success',
                duration: '2分30秒',
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
                id: '2',
                title: '部署到测试环境',
                description: '版本 v1.2.2 部署失败，构建错误',
                status: 'failed',
                duration: '1分15秒',
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
        ];
        
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('获取部署历史失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取部署历史失败',
            error: error.message 
        });
    }
});

// 获取单个作业详情
router.get('/:jobName', async (req, res) => {
    try {
        const { jobName } = req.params;
        const { workspace } = req.query;

        if (!workspace) {
            return res.status(400).json({
                success: false,
                message: '缺少必需参数: workspace'
            });
        }

        const jobDir = path.join(WORKSPACE_DIR, workspace, 'jobs', jobName);
        const jobConfigPath = path.join(jobDir, 'job.json');

        if (!fs.existsSync(jobConfigPath)) {
            return res.status(404).json({
                success: false,
                message: `作业不存在: ${jobName}`
            });
        }

        const jobConfig = JSON.parse(fs.readFileSync(jobConfigPath, 'utf8'));

        // 读取所有文件内容
        const files = {};
        const fileNames = fs.readdirSync(jobDir);

        for (const fileName of fileNames) {
            const filePath = path.join(jobDir, fileName);
            if (fs.statSync(filePath).isFile() && fileName !== 'job.json') {
                files[fileName] = {
                    content: fs.readFileSync(filePath, 'utf8'),
                    size: fs.statSync(filePath).size,
                    lastModified: fs.statSync(filePath).mtime
                };
            }
        }

        res.json({
            success: true,
            data: {
                job: {
                    ...jobConfig,
                    files: files,
                    path: jobDir
                }
            }
        });

    } catch (error) {
        console.error('获取作业详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取作业详情失败',
            error: error.message
        });
    }
});

// 删除作业
router.delete('/:jobName', async (req, res) => {
    try {
        const { jobName } = req.params;
        const { workspace } = req.query;

        if (!workspace) {
            return res.status(400).json({
                success: false,
                message: '缺少必需参数: workspace'
            });
        }

        const jobDir = path.join(WORKSPACE_DIR, workspace, 'jobs', jobName);

        if (!fs.existsSync(jobDir)) {
            return res.status(404).json({
                success: false,
                message: `作业不存在: ${jobName}`
            });
        }

        // 递归删除作业目录
        fs.rmSync(jobDir, { recursive: true, force: true });

        res.json({
            success: true,
            message: '作业删除成功'
        });

    } catch (error) {
        console.error('删除作业失败:', error);
        res.status(500).json({
            success: false,
            message: '删除作业失败',
            error: error.message
        });
    }
});

module.exports = router;
