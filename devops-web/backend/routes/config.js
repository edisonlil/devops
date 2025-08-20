const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

const DEVOPS_PATH = process.env.DEVOPS_HOME || path.join(__dirname, '../../../');
const WORKSPACE_PATH = path.join(DEVOPS_PATH, 'workspace');

// 获取工作空间配置
router.get('/:workspace', async (req, res) => {
    try {
        const { workspace } = req.params;
        const configPath = path.join(WORKSPACE_PATH, workspace, 'config');
        
        if (!await fs.pathExists(configPath)) {
            return res.status(404).json({ error: 'Config file not found' });
        }
        
        const configContent = await fs.readFile(configPath, 'utf8');
        const config = parseConfigFile(configContent);
        
        res.json({
            workspace,
            config,
            raw: configContent
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新工作空间配置
router.put('/:workspace', async (req, res) => {
    try {
        const { workspace } = req.params;
        const { config } = req.body;
        
        const workspacePath = path.join(WORKSPACE_PATH, workspace);
        if (!await fs.pathExists(workspacePath)) {
            return res.status(404).json({ error: 'Workspace not found' });
        }
        
        const configContent = generateConfigFile(config);
        const configPath = path.join(workspacePath, 'config');
        
        await fs.writeFile(configPath, configContent);
        
        res.json({
            success: true,
            workspace,
            config
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取配置模板
router.get('/template/:platform', (req, res) => {
    try {
        const { platform } = req.params;
        
        const templates = {
            'DOCKER_SWARM': {
                BUILD_PLATFORM: 'DOCKER_SWARM',
                BUILD_DOCKER_STACK_NAME: 'app',
                BUILD_DOCKER_SWARM_NETWORK: 'app-network',
                BUILD_HARBOR_ADDRESS: 'harbor.example.com',
                BUILD_HARBOR_PROJECT: 'project',
                BUILD_ENABEL_TEMPLATES: '',
                BUILD_ENABEL_DOCKERFILES: ''
            },
            'KUBERNETES': {
                BUILD_PLATFORM: 'KUBERNETES',
                BUILD_K8S_NAMESPACE: 'default',
                BUILD_HARBOR_ADDRESS: 'harbor.example.com',
                BUILD_HARBOR_PROJECT: 'project',
                BUILD_ENABEL_TEMPLATES: '',
                BUILD_ENABEL_DOCKERFILES: ''
            },
            'DOCKER_COMPOSE': {
                BUILD_PLATFORM: 'DOCKER_COMPOSE',
                BUILD_HARBOR_ADDRESS: 'harbor.example.com',
                BUILD_HARBOR_PROJECT: 'project',
                BUILD_ENABEL_TEMPLATES: '',
                BUILD_ENABEL_DOCKERFILES: ''
            }
        };
        
        const template = templates[platform];
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        res.json({
            platform,
            template
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 验证配置
router.post('/validate', (req, res) => {
    try {
        const { config } = req.body;
        const errors = [];
        const warnings = [];
        
        // 必需字段验证
        if (!config.BUILD_PLATFORM) {
            errors.push('BUILD_PLATFORM is required');
        } else if (!['DOCKER_SWARM', 'KUBERNETES', 'DOCKER_COMPOSE'].includes(config.BUILD_PLATFORM)) {
            errors.push('BUILD_PLATFORM must be one of: DOCKER_SWARM, KUBERNETES, DOCKER_COMPOSE');
        }
        
        // 平台特定验证
        if (config.BUILD_PLATFORM === 'DOCKER_SWARM') {
            if (!config.BUILD_DOCKER_STACK_NAME) {
                errors.push('BUILD_DOCKER_STACK_NAME is required for Docker Swarm');
            }
            if (!config.BUILD_DOCKER_SWARM_NETWORK) {
                warnings.push('BUILD_DOCKER_SWARM_NETWORK is recommended for Docker Swarm');
            }
        }
        
        if (config.BUILD_PLATFORM === 'KUBERNETES') {
            if (!config.BUILD_K8S_NAMESPACE) {
                warnings.push('BUILD_K8S_NAMESPACE not specified, will use "default"');
            }
        }
        
        // Harbor配置验证
        if (!config.BUILD_HARBOR_ADDRESS) {
            warnings.push('BUILD_HARBOR_ADDRESS not specified');
        }
        if (!config.BUILD_HARBOR_PROJECT) {
            warnings.push('BUILD_HARBOR_PROJECT not specified');
        }
        
        res.json({
            valid: errors.length === 0,
            errors,
            warnings
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 解析配置文件
function parseConfigFile(content) {
    const config = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const match = trimmed.match(/^([^=]+)=["']?([^"']*)["']?$/);
            if (match) {
                config[match[1]] = match[2];
            }
        }
    }
    
    return config;
}

// 生成配置文件内容
function generateConfigFile(config) {
    let content = '';
    
    // 添加注释和配置项
    content += '\n#构建平台，是 DOCKER_SWARM,KUBERNETES,DOCKER_COMPOSE\n';
    content += `BUILD_PLATFORM="${config.BUILD_PLATFORM || 'DOCKER_SWARM'}"\n\n`;
    
    if (config.BUILD_PLATFORM === 'DOCKER_SWARM' || !config.BUILD_PLATFORM) {
        content += `BUILD_DOCKER_STACK_NAME="${config.BUILD_DOCKER_STACK_NAME || 'app'}"\n\n`;
        content += `BUILD_DOCKER_SWARM_NETWORK="${config.BUILD_DOCKER_SWARM_NETWORK || 'app-network'}"\n\n`;
    }
    
    if (config.BUILD_PLATFORM === 'KUBERNETES') {
        content += '#配置Kubernetes namespace\n';
        content += `BUILD_K8S_NAMESPACE="${config.BUILD_K8S_NAMESPACE || 'default'}"\n\n`;
    }
    
    content += '#配置harbor仓库地址\n';
    content += `BUILD_HARBOR_ADDRESS="${config.BUILD_HARBOR_ADDRESS || 'harbor.example.com'}"\n\n`;
    
    content += '#配置harbor仓库\n';
    content += `BUILD_HARBOR_PROJECT="${config.BUILD_HARBOR_PROJECT || 'project'}"\n\n`;
    
    content += '#启用dockerfile,路由dockerfile\n';
    content += `BUILD_ENABEL_DOCKERFILES="${config.BUILD_ENABEL_DOCKERFILES || ''}"\n\n`;
    
    content += '#启用模板\n';
    content += `BUILD_ENABEL_TEMPLATES="${config.BUILD_ENABEL_TEMPLATES || ''}"\n`;
    
    return content;
}

module.exports = router;
