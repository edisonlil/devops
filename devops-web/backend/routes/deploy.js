const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

const DEVOPS_PATH = process.env.DEVOPS_HOME || path.join(__dirname, '../../../');
const DEPLOY_PATH = path.join(DEVOPS_PATH, 'deploy');

// 获取部署历史
router.get('/history', async (req, res) => {
    try {
        const { workspace, limit = 50, offset = 0 } = req.query;
        
        let deployments = [];
        
        if (workspace) {
            // 获取特定工作空间的部署
            const workspaceDeployPath = path.join(DEPLOY_PATH, workspace);
            if (await fs.pathExists(workspaceDeployPath)) {
                const files = await fs.readdir(workspaceDeployPath);
                for (const file of files) {
                    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
                        const filePath = path.join(workspaceDeployPath, file);
                        const stat = await fs.stat(filePath);
                        const content = await fs.readFile(filePath, 'utf8');
                        
                        deployments.push({
                            id: `${workspace}-${file}`,
                            workspace,
                            filename: file,
                            jobName: file.replace(/\.(yml|yaml)$/, ''),
                            path: filePath,
                            size: stat.size,
                            createdAt: stat.birthtime,
                            modifiedAt: stat.mtime,
                            content: content.substring(0, 500) + (content.length > 500 ? '...' : '')
                        });
                    }
                }
            }
        } else {
            // 获取所有工作空间的部署
            if (await fs.pathExists(DEPLOY_PATH)) {
                const workspaces = await fs.readdir(DEPLOY_PATH);
                for (const ws of workspaces) {
                    const wsPath = path.join(DEPLOY_PATH, ws);
                    const stat = await fs.stat(wsPath);
                    if (stat.isDirectory()) {
                        const files = await fs.readdir(wsPath);
                        for (const file of files) {
                            if (file.endsWith('.yml') || file.endsWith('.yaml')) {
                                const filePath = path.join(wsPath, file);
                                const fileStat = await fs.stat(filePath);
                                const content = await fs.readFile(filePath, 'utf8');
                                
                                deployments.push({
                                    id: `${ws}-${file}`,
                                    workspace: ws,
                                    filename: file,
                                    jobName: file.replace(/\.(yml|yaml)$/, ''),
                                    path: filePath,
                                    size: fileStat.size,
                                    createdAt: fileStat.birthtime,
                                    modifiedAt: fileStat.mtime,
                                    content: content.substring(0, 500) + (content.length > 500 ? '...' : '')
                                });
                            }
                        }
                    }
                }
            }
        }
        
        // 按修改时间排序
        deployments.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
        
        const total = deployments.length;
        const paginatedDeployments = deployments.slice(offset, offset + limit);
        
        res.json({
            total,
            deployments: paginatedDeployments,
            pagination: {
                limit,
                offset,
                hasMore: offset + limit < total
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取特定部署文件
router.get('/:workspace/:filename', async (req, res) => {
    try {
        const { workspace, filename } = req.params;
        const filePath = path.join(DEPLOY_PATH, workspace, filename);
        
        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({ error: 'Deployment file not found' });
        }
        
        const content = await fs.readFile(filePath, 'utf8');
        const stat = await fs.stat(filePath);
        
        res.json({
            workspace,
            filename,
            jobName: filename.replace(/\.(yml|yaml)$/, ''),
            content,
            size: stat.size,
            createdAt: stat.birthtime,
            modifiedAt: stat.mtime
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除部署文件
router.delete('/:workspace/:filename', async (req, res) => {
    try {
        const { workspace, filename } = req.params;
        const filePath = path.join(DEPLOY_PATH, workspace, filename);
        
        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({ error: 'Deployment file not found' });
        }
        
        await fs.remove(filePath);
        
        res.json({
            success: true,
            message: 'Deployment file deleted'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取部署统计
router.get('/stats/summary', async (req, res) => {
    try {
        const stats = {
            totalWorkspaces: 0,
            totalDeployments: 0,
            recentDeployments: 0,
            workspaceStats: {}
        };
        
        if (await fs.pathExists(DEPLOY_PATH)) {
            const workspaces = await fs.readdir(DEPLOY_PATH);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            for (const workspace of workspaces) {
                const wsPath = path.join(DEPLOY_PATH, workspace);
                const stat = await fs.stat(wsPath);
                
                if (stat.isDirectory()) {
                    stats.totalWorkspaces++;
                    stats.workspaceStats[workspace] = {
                        deployments: 0,
                        recentDeployments: 0,
                        lastDeployment: null
                    };
                    
                    const files = await fs.readdir(wsPath);
                    for (const file of files) {
                        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
                            const filePath = path.join(wsPath, file);
                            const fileStat = await fs.stat(filePath);
                            
                            stats.totalDeployments++;
                            stats.workspaceStats[workspace].deployments++;
                            
                            if (fileStat.mtime > oneDayAgo) {
                                stats.recentDeployments++;
                                stats.workspaceStats[workspace].recentDeployments++;
                            }
                            
                            if (!stats.workspaceStats[workspace].lastDeployment || 
                                fileStat.mtime > new Date(stats.workspaceStats[workspace].lastDeployment)) {
                                stats.workspaceStats[workspace].lastDeployment = fileStat.mtime;
                            }
                        }
                    }
                }
            }
        }
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 清理旧的部署文件
router.post('/cleanup', async (req, res) => {
    try {
        const { workspace, daysOld = 30 } = req.body;
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        
        let deletedFiles = 0;
        let totalSize = 0;
        
        const processWorkspace = async (wsName) => {
            const wsPath = path.join(DEPLOY_PATH, wsName);
            if (await fs.pathExists(wsPath)) {
                const files = await fs.readdir(wsPath);
                for (const file of files) {
                    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
                        const filePath = path.join(wsPath, file);
                        const stat = await fs.stat(filePath);
                        
                        if (stat.mtime < cutoffDate) {
                            totalSize += stat.size;
                            await fs.remove(filePath);
                            deletedFiles++;
                        }
                    }
                }
            }
        };
        
        if (workspace) {
            await processWorkspace(workspace);
        } else {
            // 清理所有工作空间
            if (await fs.pathExists(DEPLOY_PATH)) {
                const workspaces = await fs.readdir(DEPLOY_PATH);
                for (const ws of workspaces) {
                    const wsPath = path.join(DEPLOY_PATH, ws);
                    const stat = await fs.stat(wsPath);
                    if (stat.isDirectory()) {
                        await processWorkspace(ws);
                    }
                }
            }
        }
        
        res.json({
            success: true,
            deletedFiles,
            totalSize,
            message: `Deleted ${deletedFiles} files (${(totalSize / 1024).toFixed(2)} KB)`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
