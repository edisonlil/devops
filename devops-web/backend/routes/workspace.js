const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

const DEVOPS_PATH = process.env.DEVOPS_HOME || path.join(__dirname, '../../../');
const WORKSPACE_PATH = path.join(DEVOPS_PATH, 'workspace');

// 获取所有工作空间
router.get('/', async (req, res) => {
    try {
        const workspaces = [];
        const items = await fs.readdir(WORKSPACE_PATH);
        
        for (const item of items) {
            const itemPath = path.join(WORKSPACE_PATH, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isDirectory() && item !== '.git') {
                const configPath = path.join(itemPath, 'config');
                const hasConfig = await fs.pathExists(configPath);
                
                let config = {};
                if (hasConfig) {
                    try {
                        const configContent = await fs.readFile(configPath, 'utf8');
                        config = parseConfigFile(configContent);
                    } catch (err) {
                        console.error(`Error reading config for ${item}:`, err);
                    }
                }
                
                workspaces.push({
                    name: item,
                    path: itemPath,
                    hasConfig,
                    config,
                    createdAt: stat.birthtime,
                    modifiedAt: stat.mtime
                });
            }
        }
        
        res.json(workspaces);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取当前活跃的工作空间
router.get('/active', async (req, res) => {
    try {
        const enablePath = path.join(WORKSPACE_PATH, 'enable');
        const enableContent = await fs.readFile(enablePath, 'utf8');
        
        // 解析enable文件获取当前工作空间
        const match = enableContent.match(/ENABEL_WORKSPACE_PATH="?([^"\n]+)"?/);
        const activeWorkspace = match ? match[1] : null;
        
        res.json({ activeWorkspace });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 设置活跃工作空间
router.post('/active', async (req, res) => {
    try {
        const { workspace } = req.body;
        const enablePath = path.join(WORKSPACE_PATH, 'enable');
        
        const enableContent = `ENABEL_WORKSPACE_PATH="${workspace}"\n`;
        await fs.writeFile(enablePath, enableContent);
        
        res.json({ success: true, activeWorkspace: workspace });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取特定工作空间详情
router.get('/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const workspacePath = path.join(WORKSPACE_PATH, name);
        
        if (!await fs.pathExists(workspacePath)) {
            return res.status(404).json({ error: 'Workspace not found' });
        }
        
        const configPath = path.join(workspacePath, 'config');
        const dockerfilePath = path.join(workspacePath, 'dockerfile');
        const templatePath = path.join(workspacePath, 'template');
        
        const workspace = {
            name,
            path: workspacePath,
            hasConfig: await fs.pathExists(configPath),
            hasDockerfile: await fs.pathExists(dockerfilePath),
            hasTemplate: await fs.pathExists(templatePath),
            config: {},
            dockerfiles: [],
            templates: []
        };
        
        // 读取配置文件
        if (workspace.hasConfig) {
            const configContent = await fs.readFile(configPath, 'utf8');
            workspace.config = parseConfigFile(configContent);
        }
        
        // 读取dockerfile列表
        if (workspace.hasDockerfile) {
            const dockerfiles = await fs.readdir(dockerfilePath);
            workspace.dockerfiles = dockerfiles.filter(f => f.endsWith('-dockerfile') || f === 'dockerfile');
        }
        
        // 读取模板列表
        if (workspace.hasTemplate) {
            const templates = await fs.readdir(templatePath);
            workspace.templates = templates.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
        }
        
        res.json(workspace);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 创建新工作空间
router.post('/', async (req, res) => {
    try {
        const { name, config } = req.body;
        
        if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
            return res.status(400).json({ error: 'Invalid workspace name' });
        }
        
        const workspacePath = path.join(WORKSPACE_PATH, name);
        
        if (await fs.pathExists(workspacePath)) {
            return res.status(409).json({ error: 'Workspace already exists' });
        }
        
        // 创建工作空间目录结构
        await fs.ensureDir(workspacePath);
        await fs.ensureDir(path.join(workspacePath, 'dockerfile'));
        await fs.ensureDir(path.join(workspacePath, 'template'));
        
        // 创建配置文件
        const configContent = generateConfigFile(config || {});
        await fs.writeFile(path.join(workspacePath, 'config'), configContent);
        
        // 创建默认模板
        const defaultTemplate = generateDefaultTemplate(config?.BUILD_PLATFORM || 'DOCKER_SWARM');
        await fs.writeFile(path.join(workspacePath, 'template', 'template.yml'), defaultTemplate);
        
        res.json({ success: true, workspace: name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除工作空间
router.delete('/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const workspacePath = path.join(WORKSPACE_PATH, name);
        
        if (!await fs.pathExists(workspacePath)) {
            return res.status(404).json({ error: 'Workspace not found' });
        }
        
        await fs.remove(workspacePath);
        res.json({ success: true });
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
    const defaultConfig = {
        BUILD_PLATFORM: 'DOCKER_SWARM',
        BUILD_DOCKER_STACK_NAME: config.name || 'app',
        BUILD_DOCKER_SWARM_NETWORK: `${config.name || 'app'}-network`,
        BUILD_K8S_NAMESPACE: config.name || 'default',
        BUILD_HARBOR_ADDRESS: 'harbor.example.com',
        BUILD_HARBOR_PROJECT: config.name || 'project',
        BUILD_ENABEL_TEMPLATES: '',
        BUILD_ENABEL_DOCKERFILES: ''
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    let content = `
#构建平台，是 DOCKER_SWARM,KUBERNETES
BUILD_PLATFORM="${finalConfig.BUILD_PLATFORM}"

BUILD_DOCKER_STACK_NAME="${finalConfig.BUILD_DOCKER_STACK_NAME}"

BUILD_DOCKER_SWARM_NETWORK="${finalConfig.BUILD_DOCKER_SWARM_NETWORK}"

#配置Kubernetes namespace
BUILD_K8S_NAMESPACE="${finalConfig.BUILD_K8S_NAMESPACE}"

#配置harbor仓库地址
BUILD_HARBOR_ADDRESS="${finalConfig.BUILD_HARBOR_ADDRESS}"

#配置harbor仓库
BUILD_HARBOR_PROJECT="${finalConfig.BUILD_HARBOR_PROJECT}"

#启用dockerfile,路由dockerfile
BUILD_ENABEL_DOCKERFILES="${finalConfig.BUILD_ENABEL_DOCKERFILES}"

#启用模板
BUILD_ENABEL_TEMPLATES="${finalConfig.BUILD_ENABEL_TEMPLATES}"
`;
    
    return content.trim() + '\n';
}

// 生成默认模板
function generateDefaultTemplate(platform) {
    if (platform === 'KUBERNETES') {
        return `apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: ?namespace
  name: ?module_name
  labels:
    app: ?module_name
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ?module_name
  template:
    metadata:
      labels:
        app: ?module_name
    spec:
      containers:
        - name: ?module_name
          image: ?image_path
          ports:
            - containerPort: 8080

---

apiVersion: v1
kind: Service
metadata:
  name: ?module_name
  namespace: ?namespace
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: ?module_name
`;
    } else {
        return `version: '3.4'
services:
  ?module_name:
    image: ?image_path
    deploy:
      mode: replicated
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          memory: 600M
        reservations:
          memory: 250M
    networks:
      - ?network
networks:
  ?network:
    external: true
`;
    }
}

module.exports = router;
